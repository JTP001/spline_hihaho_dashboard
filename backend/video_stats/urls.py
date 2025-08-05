from django.urls import path
from .views import *

urlpatterns = [
    path('', VideoListView.as_view(), name='videos'),
    path('stats/', VideoStatsListView.as_view(), name='stats_all'),
    path('<int:video_id>/stats/', VideoStatsByVideoView.as_view(), name='video_stats'),
    path('export/<int:video_id>/', VideoToJsonExportView.as_view(), name='export_video'),
    path('interactions/', InteractionStatsListView.as_view(), name='interactions_all'),
    path('<int:video_id>/interactions/', InteractionStatsByVideoView.as_view(), name='video_interactions'),
    path('monthly_views/', MonthlyViewsListView.as_view(), name='monthly_views_all'),
    path('<int:video_id>/monthly_views/', MonthlyViewsByVideoView.as_view(), name='video_monthly_views'),
    path('export/monthly_views/<str:month>/', ViewsByMonthFilteredExportView.as_view(), name='export_by_month'),
    path('export/monthly_views/<str:month>/all/', ViewsByMonthAllExportView.as_view(), name='export_by_month_all'),
    path('monthly_views/past_two_months/', PastTwoMonthsPerformanceView.as_view(), name='past_two_months_performance'),
    path('view_sessions/', ViewSessionListView.as_view(), name='view_sessions_all'),
    path('<int:video_id>/view_sessions/', ViewSessionByVideoView.as_view(), name='video_view_sessions'),
    path('questions/', QuestionStatsListView.as_view(), name='questions_all'),
    path('<int:video_id>/questions/', QuestionStatsByVideoView.as_view(), name='video_questions'),
    path('question_answers/', QuestionAnswerListView.as_view(), name='question_answers_all'),
    path('<int:question_id>/question_answers/', QuestionAnswersByQuestionView.as_view(), name='question_answers'),
    path('video_ratings/', VideoRatingListView.as_view(), name='video_ratings_all'),
    path('<int:video_id>/video_ratings/', VideoRatingByVideoView.as_view(), name='video_video_rating'),
]