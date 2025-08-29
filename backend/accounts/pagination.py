from rest_framework.pagination import PageNumberPagination

class UserLogsPagination(PageNumberPagination):
    page_size = 10