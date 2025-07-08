from django.db import models

class Video(models.Model):
    video_id = models.IntegerField()
    uuid = models.CharField()
    title = models.CharField()
    status = models.IntegerField()
    created_date = models.DateTimeField()

    def __str__(self):
        return self.video_id
    
class VideoStats(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    total_views = models.IntegerField()
    started_views = models.IntegerField()
    finished_views = models.IntegerField()
    interaction_clicks = models.IntegerField()
    video_duration_seconds = models.FloatField()

class InteractionStats(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    interaction_id = models.IntegerField()
    title = models.CharField()
    type = models.CharField()
    action_type = models.CharField()
    start_time_seconds = models.FloatField()
    end_time_seconds = models.FloatField()
    duration_seconds = models.FloatField()
    link = models.CharField()
    total_clicks = models.IntegerField()
    created_at = models.DateTimeField()

class MonthlyViews(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    month = models.CharField()
    total_views = models.IntegerField()
    started_views = models.IntegerField()
    finished_views = models.IntegerField()
    passed_views = models.IntegerField()
    failed_views = models.IntegerField()
    unfinished_views = models.IntegerField()
    
class ViewSession(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    session_id = models.IntegerField()
    started_time_unix = models.IntegerField()
    ended_time_unix = models.IntegerField()
    viewer_timezone = models.CharField()
    viewer_os = models.CharField()
    viewer_browser = models.CharField()
    viewer_mobile = models.BooleanField()
    last_reached_seconds = models.IntegerField()
    last_reached_percent = models.FloatField()

class QuestionStats(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    question_id = models.IntegerField()
    title = models.CharField()
    type = models.CharField()
    video_time_seconds = models.FloatField()
    average_answer_time_seconds = models.FloatField()
    total_answered = models.IntegerField()
    total_correctly_answered = models.IntegerField()
    created_at = models.DateTimeField()

class QuestionAnswer(models.Model):
    question = models.ForeignKey(QuestionStats, on_delete=models.CASCADE)
    label = models.CharField()
    answered_count = models.IntegerField()
    is_correct_answer = models.BooleanField()

    class Meta:
        unique_together = ('question', 'label')

class VideoRating(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE)
    rating_id = models.IntegerField()
    average_rating = models.FloatField()
    one_star = models.IntegerField()
    two_star = models.IntegerField()
    three_star = models.IntegerField()
    four_star = models.IntegerField()
    five_star = models.IntegerField()
