from .models import *
from rest_framework import serializers
from django.contrib.auth import authenticate

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'is_superuser', 'is_staff')

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {'password':{'write_only':True}}

    def validate(self, attrs):
        password = attrs.get('password', '')
        if len(password) < 8:
            raise serializers.ValidationError('Passwords must be at least 8 characters.')
        return attrs
    
    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password')

        return CustomUser.objects.create_user(password=password, **validated_data)
    
class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(**data)
        if user and user.is_active:
            return user
        raise serializers.ValidationError('Incorrect credentials.')
    
class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password')
        extra_kwargs = {
            'username': {'required': False},
            'email': {'required': False},
        }

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
    
class ContentTogglesSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentToggles
        fields = "__all__"
        read_only_fields = ("user",)


class ContentTogglesUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentToggles
        fields = ("benesse_toggle",)