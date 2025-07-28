from django.core.management.base import BaseCommand
from video_stats.models import *
from dateutil import parser
from datetime import date
from user_agents import parse
import requests
import warnings
import os
from dotenv import load_dotenv

load_dotenv()
token = os.getenv('API_KEY')
BASE_URL = "https://api.hihaho.com/v2"
headers = {"Authorization": f"Bearer {token}"}

def get_data_safe(url, params=None):
    try:
        response = requests.get(url, headers=headers, params=params)
        json_data = response.json()
        data = json_data.get("data")
        if not data:
            return None
        return data
    except Exception as e:
        print(f"Failed to fetch from {url}: {e}")
        return None

class Command(BaseCommand):
    help = 'Fetch all Hihaho type 3 video data and stats'

    warnings.filterwarnings(
        "ignore",
        message="DateTimeField .* received a naive datetime",
        category=RuntimeWarning,
        module='django.db.models.fields'
    )

    def handle(self, *args, **kwargs):
        videos = []

        page_count = 1
        while True:
            response = requests.get(f"{BASE_URL}/video",
                headers=headers,
                params={
                    "page": page_count,
                    "order": "asc",
                }).json()
            page_count += 1

            if response.get("data"):
                videos = videos + response.get("data", {})

            if response.get("links") and response.get("links", {}).get("next") is None:
                break

        for v in videos:
            video_id = v["id"]
            title = v.get("display_name", "")

            video_obj, _ = Video.objects.update_or_create(
                video_id=video_id, # lookup field for updating
                defaults={
                    "uuid": v["uuid"],
                    "title": title,
                    "status": v["status"],
                    "created_date":parser.parse(v["created_at"]),
                }
            )
            print(f"{video_id} {v.get("video_container_id")}")
            
            v_stats = get_data_safe(f"{BASE_URL}/video/{video_id}/aggregated-statistics")
            v_data = get_data_safe(f"{BASE_URL}/video/{video_id}")
            if v_stats and v_data:
                v_duration = v_data.get("duration")
                VideoStats.objects.update_or_create(
                    video=video_obj,
                    defaults={
                        "total_views":v_stats.get("aggregated_statistics").get("views") or 0,
                        "started_views":v_stats.get("aggregated_statistics").get("started_views") or 0,
                        "finished_views":v_stats.get("aggregated_statistics").get("finished_views") or 0,
                        "interaction_clicks":v_stats.get("aggregated_statistics").get("interactions").get("total_clicks") or 0,
                        "video_duration_seconds":round(v_duration/1000, 2),
                    }
                )

                for i in v_stats["aggregated_statistics"]["interactions"]["details"]:
                    InteractionStats.objects.update_or_create(
                        video=video_obj,
                        interaction_id=i.get("id"),
                        defaults={
                            "title":i.get("title") or "",
                            "type":i.get("type") or "",
                            "action_type":i.get("action_type") or "",
                            "start_time_seconds":i.get("start_time") or 0.0,
                            "end_time_seconds":i.get("end_time") or 0.0,
                            "duration_seconds":i.get("duration") or 0.0,
                            "link":i.get("link") or "",
                            "total_clicks":i.get("total_clicks") or 0,
                            "created_at":i["created_at"],
                        }
                    )

                for q in v_stats["aggregated_statistics"]["questions"]["details"]:
                    QuestionStats.objects.update_or_create(
                        video=video_obj,
                        question_id=q.get("id"),
                        defaults={
                            "title":q.get("title") or "",
                            "type":q.get("type") or "",
                            "video_time_seconds":q.get("active_at") or 0.0,
                            "average_answer_time_seconds":0.0, # Initialize to 0 then set later
                            "total_answered":0,
                            "total_correctly_answered":0,
                            "created_at":q["created_at"],
                        }
                    )
            
            # Start and end dates
            today = date.today()
            raw_start = v["created_at"]
            start_date = raw_start.split("T")[0] + " 00:00:00"
            end_date = today.strftime("%Y-%m-%d") + " 23:59:59"

            monthly_stats = get_data_safe(f"{BASE_URL}/video/{video_id}/stats/views",
                params={
                    "group_by": "month",
                    "start_date": start_date,
                    "end_date": end_date
                }
            )

            if monthly_stats:
                for month in monthly_stats:
                    MonthlyViews.objects.update_or_create(
                        video=video_obj,
                        month=month.get("period") or "",
                        defaults={
                            "total_views":month.get("total") or 0,
                            "started_views":month.get("started") or 0,
                            "finished_views":month.get("finished") or 0,
                            "passed_views":month.get("passed") or 0,
                            "failed_views":month.get("failed") or 0,
                            "unfinished_views":month.get("unfinished") or 0
                        }
                    )

            # v_sessions = get_data_safe(f"{BASE_URL}/video/{video_id}/stats/metadata")
            # if v_sessions:
            #     for session in v_sessions:
            #         session_id = session.get("id")
            #         user_agent = parse(session.get("user_agent"))

            #         session_details = get_data_safe(f"{BASE_URL}/video/{video_id}/session/{session_id}")
            #         last_reached_seconds = 0
            #         last_reached_percent = 0
            #         if (session_details):
            #             last_reached_seconds = session_details.get("last_reached_point_seconds")
            #             last_reached_percent = session_details.get("last_reached_point_percentage")

            #         ViewSession.objects.update_or_create(
            #             video=video_obj,
            #             session_id=session_id,
            #             defaults={
            #                 "started_time_unix":session.get("started_at") or 0,
            #                 "ended_time_unix":session.get("closed_at") or 0,
            #                 "viewer_timezone":session.get("timezone") or "",
            #                 "viewer_os":user_agent.os.family,
            #                 "viewer_browser":user_agent.browser.family,
            #                 "viewer_mobile":user_agent.is_mobile,
            #                 "last_reached_seconds":last_reached_seconds,
            #                 "last_reached_percent":last_reached_percent
            #             }
            #         )
            
            question_list = get_data_safe(f"{BASE_URL}/video/{video_id}/stats/questions/")
            if question_list:
                for question in question_list:
                    try:
                        question_obj = QuestionStats.objects.get(question_id=question.get("id"))
                    except QuestionStats.DoesNotExist:
                        # Skip this question if the object doesn't already exist cause here we just update
                        continue

                    question_obj.average_answer_time_seconds = question.get("average_answer_time_seconds") or 0.0
                    question_obj.total_answered = question.get("total_given_answers") or 0
                    question_obj.total_correctly_answered = question.get("total_correct_answers") or 0
                    question_obj.save()
                    

                    if question.get("question_type") in ['mc', 'mr', 'image']: # Only get answers for questions with finite answer possibilities
                        answer_list = question.get("answers")
                        if answer_list:
                            for answer in answer_list:
                                QuestionAnswer.objects.update_or_create(
                                    question=question_obj,
                                    label=answer.get("label"),
                                    defaults={
                                        "answered_count":answer.get("answered_count") or 0,
                                        "is_correct_answer":answer.get("is_correct_answer")
                                    }
                                )

            
            # This assumes there is at least 0 ratings and at most 1 rating per video, specifically for Benesse
            if question_list:
                rating_index = 0
                while rating_index < len(question_list) and question_list[rating_index].get("question_type") != "rating":
                    rating_index += 1

                if rating_index < len(question_list):
                    one_star = 0
                    two_star = 0
                    three_star = 0
                    four_star = 0
                    five_star = 0
                    
                    for rating_category in question_list[rating_index].get("answers"):
                        if rating_category.get("label") == "1":
                            one_star = rating_category.get("answered_count")
                        if rating_category.get("label") == "2":
                            two_star = rating_category.get("answered_count")
                        if rating_category.get("label") == "3":
                            three_star = rating_category.get("answered_count")
                        if rating_category.get("label") == "4":
                            four_star = rating_category.get("answered_count")
                        if rating_category.get("label") == "5":
                            five_star = rating_category.get("answered_count")

                    VideoRating.objects.update_or_create(
                        video=video_obj,
                        rating_id=question_list[rating_index].get("id"),
                        defaults={
                            "average_rating":question_list[rating_index].get("average_rating") or 0,
                            "one_star":one_star,
                            "two_star":two_star,
                            "three_star":three_star,
                            "four_star":four_star,
                            "five_star":five_star,
                        }
                    )
        
        self.stdout.write(self.style.SUCCESS("Successfully fetched video data"))
