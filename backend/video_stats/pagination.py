from rest_framework.pagination import PageNumberPagination

class ViewPagination(PageNumberPagination):
    page_size = 1000