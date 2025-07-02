from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    username = models.CharField(unique=True)
    benesse = models.BooleanField()
    USERNAME_FIELD='username'

    def __str__(self) -> str:
        return self.username