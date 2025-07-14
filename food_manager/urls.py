from django.urls import path
from . import views

urlpatterns = [
    # Page route
    path('', views.index, name='index'),
    
    # API routes
    path('api/food_items', views.food_item_list, name='food_item_list'),
    path('api/food_items/<int:item_id>', views.food_item_detail, name='food_item_detail'),
    path('api/close_sales', views.close_sales, name='close_sales'),
    path('api/start_new_sales', views.start_new_sales, name='start_new_sales'),
] 