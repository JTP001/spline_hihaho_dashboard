from rest_framework import serializers
from .models import *

class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = "__all__"

class VideoStatsSerializer(serializers.ModelSerializer):
    video = VideoSerializer()

    class Meta:
        model = VideoStats
        fields = "__all__"

class InteractionStatsSerializer(serializers.ModelSerializer):
    video = VideoSerializer()
    
    class Meta:
        model = InteractionStats
        fields = "__all__"

class MonthlyViewsSerializer(serializers.ModelSerializer):
    video = VideoSerializer()
    
    class Meta:
        model = MonthlyViews
        fields = "__all__"

class ViewSessionSerializer(serializers.ModelSerializer):
    video = VideoSerializer()
    
    class Meta:
        model = ViewSession
        fields = "__all__"

class QuestionStatsSerializer(serializers.ModelSerializer):
    video = VideoSerializer()
    
    class Meta:
        model = QuestionStats
        fields = "__all__"

class QuestionAnswerSerializer(serializers.ModelSerializer):
    question = QuestionStatsSerializer()
    
    class Meta:
        model = QuestionAnswer
        fields = "__all__"

class VideoRatingSerializer(serializers.ModelSerializer):
    video = VideoSerializer()

    class Meta:
        model = VideoRating
        fields = "__all__"