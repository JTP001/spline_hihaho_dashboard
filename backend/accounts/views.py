from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework import status
from .serializers import *
from .pagination import *

class UserRegistrationAPIView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = UserRegistrationSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = RefreshToken.for_user(user)
        data = serializer.data
        data['tokens'] = {'refresh':str(token),
                          'access':str(token.access_token)}
        return Response(data, status=status.HTTP_201_CREATED)
                        
class UserLoginAPIView(generics.GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserLoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data = request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data
        serializer = CustomUserSerializer(user)
        token = RefreshToken.for_user(user)
        data = serializer.data
        data['tokens'] = {'refresh':str(token),
                          'access':str(token.access_token)}
        UserLogs.objects.create(user=user, message=f"{user.username} logged in")
        return Response(data, status=status.HTTP_200_OK)

class UserLogoutAPIView(generics.GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        
class UserUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
        
class UserAPIView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = CustomUserSerializer

    def get_object(self):
        return self.request.user
    
class ListUsersView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CustomUserSerializer

    def get_queryset(self):
        return CustomUser.objects.exclude(id=self.request.user.id)
    
class DeleteUserView(generics.DestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = CustomUser.objects.all()
    lookup_field = "id"

    def perform_destroy(self, instance):
        if instance.id == self.request.user.id:
            raise ValidationError("You cannot delete your own account.")
        instance.delete()
    
class ContentToggleByUserView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContentTogglesSerializer

    def get_object(self):
        return self.request.user.content_toggles

class ContentTogglesUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContentTogglesUpdateSerializer

    def get_object(self):
        return self.request.user.content_toggles
    
class UserLogsListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = UserLogs.objects.all().order_by('-timestamp')
    serializer_class = UserLogsSerializer
    pagination_class = UserLogsPagination