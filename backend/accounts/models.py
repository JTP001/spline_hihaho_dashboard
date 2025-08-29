from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class CustomUser(AbstractUser):
    username = models.CharField(unique=True)
    USERNAME_FIELD='username'

    def __str__(self) -> str:
        return self.username
    
class ContentToggles(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name="content_toggles")
    benesse_toggle = models.BooleanField(default=False)

class UserLogs(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    message = models.CharField()
    timestamp = models.DateTimeField(default=timezone.now)