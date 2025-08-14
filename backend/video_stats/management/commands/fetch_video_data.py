from django.core.management.base import BaseCommand
from video_stats.models import *
from dateutil import parser
from datetime import date
from user_agents import parse
import datetime
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
            video_id = v.get("id")
            title = v.get("display_name", "")
            container = v.get("video_container")
            container_name = ""
            container_id = 0
            if container:
                container_name = container.get("name")
                container_id = container.get("id")

            video_obj, _ = Video.objects.update_or_create(
                video_id=video_id, # lookup field for updating
                defaults={
                    "uuid": v.get("uuid"),
                    "title": title,
                    "status": v.get("status"),
                    "folder_name":container_name,
                    "folder_number":container_id,
                    "created_date":parser.parse(v.get("created_at")),
                }
            )
            print(f"{video_id} {v.get("video_container_id")}")

            v_data = get_data_safe(f"{BASE_URL}/video/{video_id}")
            if v_data:
                v_duration = v_data.get("duration")
                # Initialize VideoStats object even when no aggregated stats
                VideoStats.objects.update_or_create(
                    video=video_obj,
                    defaults={
                        "total_views":0,
                        "started_views":0,
                        "finished_views":0,
                        "interaction_clicks":0,
                        "num_questions":0,
                        "video_duration_seconds":round(v_duration/1000, 2) or 11.11,
                    }
                )
            
            v_stats = get_data_safe(f"{BASE_URL}/video/{video_id}/aggregated-statistics")
            if v_stats:
                # If there are aggregated stats, update VideoStats object accordingly
                videostats_obj = VideoStats.objects.get(video=video_obj)
                videostats_obj.total_views = v_stats.get("aggregated_statistics").get("views") or 0
                videostats_obj.started_views = v_stats.get("aggregated_statistics").get("started_views") or 0
                videostats_obj.finished_views = v_stats.get("aggregated_statistics").get("finished_views") or 0
                videostats_obj.interaction_clicks = v_stats.get("aggregated_statistics").get("interactions").get("total_clicks") or 0
                videostats_obj.num_questions = v_stats.get("aggregated_statistics").get("questions").get("count") or 0
                videostats_obj.save()

                # Initialize all interactions if there are aggregated stats so interactions with 0 clicks are included
                for i in v_stats["aggregated_statistics"]["interactions"]["details"]:
                    InteractionStats.objects.update_or_create(
                        video=video_obj,
                        interaction_id=i.get("id"),
                        defaults={
                            "title":i.get("title") or "",
                            "type":i.get("type") or "",
                            "action_type":i.get("action_type") or "",
                            "start_time_seconds":i.get("start_time_seconds") or 0.0,
                            "end_time_seconds":i.get("end_time_seconds") or 0.0,
                            "duration_seconds":i.get("duration_seconds") or 0.0,
                            "link":i.get("link") or "",
                            "total_clicks":i.get("total_clicks") or 0,
                            "created_at":i.get("created_at") or datetime.datetime.fromtimestamp(0),
                        }
                    )

                # Initialize all questions if there are aggregated stats so questions with 0 answers are included
                for q in v_stats["aggregated_statistics"]["questions"]["details"]:
                    QuestionStats.objects.update_or_create(
                        video=video_obj,
                        question_id=q.get("id"),
                        defaults={
                            "title":q.get("title") or "",
                            "type":q.get("type") or "",
                            "video_time_seconds":q.get("active_at") or 0.0,
                            "average_answer_time_seconds":0.0,
                            "total_answered":q.get("amount_answers") or 0,
                            "total_correctly_answered":q.get("amount_correct_answers") or 0,
                            "created_at":q.get("created_at") or datetime.datetime.fromtimestamp(0),
                        }
                    )
            
            # Start and end dates
            today = date.today()
            raw_start = v.get("created_at")
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

            index = 1
            v_session = get_data_safe(f"{BASE_URL}/video/{video_id}/stats/views-by-user-agent")
            if v_session:
                for agent_type, count in v_session.items():
                    if (agent_type != "unknown"):
                        user_agent = parse(agent_type)

                        ViewSession.objects.update_or_create(
                            video=video_obj,
                            object_id=index,
                            defaults={
                                "viewer_os":user_agent.os.family or "",
                                "os_version":user_agent.os.version_string or "",
                                "viewer_browser":user_agent.browser.family or "",
                                "browser_version":user_agent.browser.version_string or "",
                                "viewer_device":user_agent.device.model or "N/A",
                                "viewer_mobile":user_agent.is_mobile or False,
                                "is_bot":user_agent.is_bot or False,
                                "viewer_count":count or 0,
                            }
                        )
                    index += 1

            interaction_list = get_data_safe(f"{BASE_URL}/video/{video_id}/stats/interactions/")
            if interaction_list:
                for interaction in interaction_list:
                    interaction_id = interaction.get("id")
                    
                    try:
                        existing = InteractionStats.objects.get(interaction_id=interaction_id)
                    except InteractionStats.DoesNotExist:
                        existing = None

                    # Update if exists or if not create each interaction
                    InteractionStats.objects.update_or_create(
                        video=video_obj,
                        interaction_id=interaction_id,
                        defaults={
                            "title": interaction.get("title") or "",
                            "type": existing.type if existing else "",
                            "action_type": existing.action_type if existing else "",
                            "start_time_seconds": interaction.get("start_time") or 0.0,
                            "end_time_seconds": interaction.get("end_time") or 0.0,
                            "duration_seconds": existing.duration_seconds if existing else 0.0,
                            "link": interaction.get("link") or "",
                            "total_clicks": interaction.get("total_times_clicked") or 0,
                            "created_at": existing.created_at if existing else datetime.datetime.fromtimestamp(0),
                        }
                    )
            
            question_list = get_data_safe(f"{BASE_URL}/video/{video_id}/stats/questions/")
            if question_list:
                for question in question_list:
                    question_id = question.get("id")
                    
                    try:
                        existing = QuestionStats.objects.get(question_id=question_id)
                    except QuestionStats.DoesNotExist:
                        existing = None

                    # Update if exists or if not create each interaction
                    question_obj, _ = QuestionStats.objects.update_or_create(
                        video=video_obj,
                        question_id=question_id,
                        defaults={
                            "title":question.get("question_text") or "",
                            "type":question.get("question_type") or "",
                            "video_time_seconds":question.get("video_time") or 0.0,
                            "average_answer_time_seconds": question.get("average_answer_time_seconds") or 0.0,
                            "total_answered": question.get("total_given_answers") or 0,
                            "total_correctly_answered": question.get("total_correct_answers") or 0,
                            "created_at": existing.created_at if existing else datetime.datetime.fromtimestamp(0),
                        }
                    )
                    

                    if question.get("question_type") in ['mc', 'mr', 'image']: # Only get answers for questions with finite answer possibilities
                        answer_list = question.get("answers")
                        if answer_list:
                            for answer in answer_list:
                                label = answer.get("label")
                                answered_count = answer.get("answered_count") or 0
                                is_correct_answer = answer.get("is_correct_answer")

                                try: # This section is needed because the Hihaho API sometimes duplicates the correct answer and has one with answered count 0
                                    existing = QuestionAnswer.objects.get(question=question_obj, label=label)

                                    if existing.answered_count > 0 and answered_count == 0:
                                        continue  # Skip this duplicate with 0 count

                                    # Otherwise, update the existing one if needed
                                    QuestionAnswer.objects.update_or_create(
                                        question=question_obj,
                                        label=label,
                                        defaults={
                                            "answered_count":answered_count,
                                            "is_correct_answer":is_correct_answer,
                                        }
                                    )
                                except QuestionAnswer.DoesNotExist:
                                    QuestionAnswer.objects.update_or_create(
                                        question=question_obj,
                                        label=label,
                                        defaults={
                                            "answered_count":answered_count,
                                            "is_correct_answer":is_correct_answer,
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
