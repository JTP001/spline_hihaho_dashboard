from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import *

@receiver(post_save, sender=CustomUser)
def create_user_toggles(sender, instance, created, **kwargs):
    if created:
        ContentToggles.objects.create(user=instance)
