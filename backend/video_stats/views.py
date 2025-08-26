from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .pagination import ViewPagination
from django.http import HttpResponse, JsonResponse
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from django.http import StreamingHttpResponse
from django.utils.encoding import smart_str
from django.utils import timezone
from calendar import monthrange
from .models import Video
from .serializers import *
from io import StringIO
import warnings
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
    
class Echo:
    """An object that implements just the write method of the file-like interface.
    Used specifically in the monthly export views for CSV output streaming."""
    def write(self, value):
        return value
        
class ViewsByMonthFilteredExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, startMonth, endMonth):
        warnings.filterwarnings(
            "ignore",
            message="DateTimeField .* received a naive datetime",
            category=RuntimeWarning,
            module='django.db.models.fields'
        )

        try:
            videos = Video.objects.all().order_by("video_id")
            
            start_year, start_month = map(int, startMonth.split('-'))
            end_year, end_month = map(int, endMonth.split('-'))

            startDate = date(start_year, start_month, 1)
            endDate = date(end_year, end_month, 1)

            y_m_months_list = []
            current_date = startDate

            while current_date <= endDate:
                y_m_months_list.append(current_date.strftime('%Y-%m'))
                current_date += relativedelta(months=1)

            def row_generator():
                # BOM for Excel to handle Japanese text
                yield "\ufeff"

                pseudo_buffer = Echo()
                writer = csv.writer(pseudo_buffer)

                # Header
                yield writer.writerow(["Month", "Video ID", "Video title", "Total Views"])

                for video in videos.iterator():
                    for y_m_month in y_m_months_list:
                        year, month = map(int, y_m_month.split('-'))
                        last_day = monthrange(year, month)[1]
                        end_of_month = timezone.make_aware(
                            datetime(year, month, last_day, 23, 59, 59),
                            timezone.get_default_timezone()
                        )

                        if video.created_date <= end_of_month:
                            month_stats = MonthlyViews.objects.filter(
                                video__video_id=video.video_id, month=y_m_month
                            ).first()

                            total_views = month_stats.total_views if month_stats else 0

                            yield writer.writerow([
                                y_m_month,
                                video.video_id,
                                video.title,
                                total_views
                            ])

            # Streaming response so that the frontend worker doesn't time out on deployed version
            response = StreamingHttpResponse(
                row_generator(),
                content_type="text/csv; charset=utf-8"
            )
            response["Content-Disposition"] = (
                f'attachment; filename="{startMonth}_to_{endMonth}_views_filtered_data.csv"'
            )
            return response

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class ViewsByMonthSingleExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, video_id, startMonth, endMonth):
        warnings.filterwarnings(
            "ignore",
            message="DateTimeField .* received a naive datetime",
            category=RuntimeWarning,
            module='django.db.models.fields'
        )

        try:
            video = Video.objects.get(video_id=video_id)

            start_year, start_month = map(int, startMonth.split('-'))
            end_year, end_month = map(int, endMonth.split('-'))

            startDate = date(start_year, start_month, 1)
            endDate = date(end_year, end_month, 1)

            y_m_months_list = []
            current_date = startDate

            while current_date <= endDate:
                y_m_months_list.append(current_date.strftime('%Y-%m'))
                current_date += relativedelta(months=1)

            def row_generator():
                # BOM for Excel to handle Japanese text
                yield "\ufeff"

                pseudo_buffer = Echo()
                writer = csv.writer(pseudo_buffer)

                # Header
                yield writer.writerow(["Month", "Video ID", "Video title", "Total Views"])

                for y_m_month in y_m_months_list:
                    year, month = map(int, y_m_month.split('-'))
                    last_day = monthrange(year, month)[1]
                    end_of_month = timezone.make_aware(
                        datetime(year, month, last_day, 23, 59, 59),
                        timezone.get_default_timezone()
                    )

                    if video.created_date <= end_of_month:
                        month_stats = MonthlyViews.objects.filter(
                            video__video_id=video.video_id, month=y_m_month
                        ).first()

                        total_views = month_stats.total_views if month_stats else 0

                        yield writer.writerow([
                            y_m_month,
                            video.video_id,
                            video.title,
                            total_views
                        ])

            # Streaming response so that the frontend worker doesn't time out on deployed version
            response = StreamingHttpResponse(
                row_generator(),
                content_type="text/csv; charset=utf-8"
            )
            response["Content-Disposition"] = (
                f'attachment; filename="{video_id}_{startMonth}_to_{endMonth}_views_single_data.csv"'
            )
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

class VideoRatingByVideoView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VideoRatingSerializer

    def get_queryset(self):
        video_id = self.kwargs["video_id"]
        return VideoRating.objects.filter(video__video_id=video_id)