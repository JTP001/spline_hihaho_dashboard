from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .pagination import ViewPagination
from django.http import HttpResponse, JsonResponse
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from calendar import monthrange
from .models import Video
from .serializers import *
from io import StringIO
import requests
import csv
import json
import os
from dotenv import load_dotenv

load_dotenv()
token = os.getenv('API_KEY')
BASE_URL = "https://api.hihaho.com/v2"
headers = {"Authorization": f"Bearer {token}"}

class VideoListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Video.objects.all()
    serializer_class = VideoSerializer

class VideoStatsListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = VideoStats.objects.all()
    serializer_class = VideoStatsSerializer

class VideoStatsByVideoView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VideoStatsSerializer
    
    def get_queryset(self):
        video_id = self.kwargs["video_id"]
        return VideoStats.objects.filter(video__video_id=video_id)
    
class VideoToJsonExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, video_id):
        api_response = requests.get(f"{BASE_URL}/video/{video_id}/export", headers=headers)

        if api_response.status_code != 200:
            return JsonResponse({"error": "Failed to fetch JSON data to export"}, status=500)
        
        data = api_response.json()

        response = HttpResponse(
            json.dumps(data, indent=2),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="video_data_{video_id}.json"'
        return response

class InteractionStatsListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = InteractionStats.objects.all().order_by('-total_clicks')
    serializer_class = InteractionStatsSerializer
    pagination_class = ViewPagination

class InteractionStatsByVideoView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InteractionStatsSerializer

    def get_queryset(self):
        video_id = self.kwargs["video_id"]
        return InteractionStats.objects.filter(video__video_id=video_id)

class MonthlyViewsListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = MonthlyViews.objects.all()
    serializer_class = MonthlyViewsSerializer
    pagination_class = ViewPagination

class MonthlyViewsByVideoView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MonthlyViewsSerializer

    def get_queryset(self):
        video_id = self.kwargs["video_id"]
        return MonthlyViews.objects.filter(video__video_id=video_id)
        
class ViewsByMonthFilteredExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, month):
        try:
            year, month_num = map(int, month.split('-'))
            last_day = monthrange(year, month_num)[1]
            end_of_month = datetime(year, month_num, last_day, 23, 59, 59)

            # Uses the last day of the given month and filters for only vides before that last day (lte = less than equals)
            videos = Video.objects.all().filter(created_date__lte=end_of_month).order_by("video_id")

            csv_buffer = StringIO()
            csv_buffer.write("\ufeff")  # BOM for Excel needed to display Japanese text
            writer = csv.writer(csv_buffer)

            # Header row
            writer.writerow([
                "Video ID", "Video title", "Total Views"
            ])

            for video in videos:
                month_stats = MonthlyViews.objects.filter(video__video_id=video.video_id, month=month).first()

                total_views = month_stats.total_views if month_stats else 0

                writer.writerow([
                    video.video_id, video.title, total_views
                ])

            # HTTP response
            response = HttpResponse(csv_buffer.getvalue(), content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = f'attachment; filename="{month}_views_data.csv"'
            return response

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class ViewsByMonthAllExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, month):
        try:
            videos = Video.objects.all().order_by("video_id")

            csv_buffer = StringIO()
            csv_buffer.write("\ufeff")  # BOM for Excel needed to display Japanese text
            writer = csv.writer(csv_buffer)

            # Header row
            writer.writerow([
                "Video ID", "Video title", "Total Views"
            ])

            for video in videos:
                month_stats = MonthlyViews.objects.filter(video__video_id=video.video_id, month=month).first()

                total_views = month_stats.total_views if month_stats else 0

                writer.writerow([
                    video.video_id, video.title, total_views
                ])

            # HTTP response
            response = HttpResponse(csv_buffer.getvalue(), content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = f'attachment; filename="{month}_views_data.csv"'
            return response

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class PastTwoMonthsPerformanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = datetime.today()
        last_month = (today.replace(day=1) - relativedelta(months=1)).strftime('%Y-%m')
        two_months_ago = (today.replace(day=1) - relativedelta(months=2)).strftime('%Y-%m')

        dict = {}
        videos = Video.objects.all()

        for video in videos:
            video_id = str(video.video_id)

            views_last_month = MonthlyViews.objects.filter(video=video, month=last_month).first()
            views_two_months_ago = MonthlyViews.objects.filter(video=video, month=two_months_ago).first()

            count_last_month = views_last_month.total_views if views_last_month else 0
            count_two_months_ago = views_two_months_ago.total_views if views_two_months_ago else 0

            dict[video_id] = [count_last_month, count_two_months_ago]

        return Response(dict)
    
class ViewSessionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ViewSession.objects.all()
    serializer_class = ViewSessionSerializer
    pagination_class = ViewPagination

class ViewSessionByVideoView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ViewSessionSerializer

    def get_queryset(self):
        video_id = self.kwargs["video_id"]
        return ViewSession.objects.filter(video__video_id=video_id)
    
class QuestionStatsListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = QuestionStats.objects.all().order_by('-total_answered')
    serializer_class = QuestionStatsSerializer
    pagination_class = ViewPagination

class QuestionStatsByVideoView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = QuestionStatsSerializer

    def get_queryset(self):
        video_id = self.kwargs["video_id"]
        return QuestionStats.objects.filter(video__video_id=video_id)
    
class QuestionAnswerListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = QuestionAnswer.objects.all().order_by('-answered_count')
    serializer_class = QuestionAnswerSerializer
    pagination_class = ViewPagination

class QuestionAnswersByQuestionView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = QuestionAnswerSerializer

    def get_queryset(self):
        question_id = self.kwargs["question_id"]
        return QuestionAnswer.objects.filter(question__question_id=question_id)
        
class VideoRatingListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = VideoRating.objects.all()
    serializer_class = VideoRatingSerializer
    pagination_class = ViewPagination

class VideoRatingByVideoView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VideoRatingSerializer

    def get_queryset(self):
        video_id = self.kwargs["video_id"]
        return VideoRating.objects.filter(video__video_id=video_id)