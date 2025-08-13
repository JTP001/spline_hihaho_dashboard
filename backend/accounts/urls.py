from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import *

urlpatterns = [
    path('register/', UserRegistrationAPIView.as_view(), name='register'),
    path('login/', UserLoginAPIView.as_view(), name='login'),
    path('logout/', UserLogoutAPIView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('user/', UserAPIView.as_view(), name='user_info'),
    path('user/update/', UserUpdateView.as_view(), name='user_update'),
    path('user/content-toggles/', ContentToggleByUserView.as_view(), name='user_content_toggles'),
    path('user/content-toggles/update/', ContentTogglesUpdateView.as_view(), name='user_content_toggles_update'),
]