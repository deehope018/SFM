from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
from .models import FoodItem
import json
from django.views.decorators.http import require_POST

# Create your views here.

# Render the main HTML page

def index(request):
    """Renders the main HTML page."""
    return render(request, 'index.html')

@csrf_exempt
def food_item_list(request):
    """Handles listing (GET) and creating (POST) food items."""
    if request.method == 'GET':
        items = FoodItem.objects.all().order_by('-date', 'time_slot')
        data = [{
            'id': item.id,
            'name': item.name,
            'date': item.date,
            'time_slot': item.time_slot,
            'quantity_prepared': item.quantity_prepared,
            'quantity_sold': item.quantity_sold,
            'quantity_wasted': item.quantity_wasted,
            'price': item.price,
            'sales_closed': item.sales_closed
        } for item in items]
        return JsonResponse(data, safe=False)

    elif request.method == 'POST':
        data = json.loads(request.body)
        item = FoodItem.objects.create(
            name=data['name'],
            date=data['date'],
            time_slot=data['time_slot'],
            quantity_prepared=data['quantity_prepared'],
            quantity_sold=data.get('quantity_sold', 0),
            price=data['price']
        )
        return JsonResponse({
            'id': item.id,
            'name': item.name,
            'date': item.date,
            'time_slot': item.time_slot,
            'quantity_prepared': item.quantity_prepared,
            'quantity_sold': item.quantity_sold,
            'quantity_wasted': item.quantity_wasted,
            'price': item.price,
            'sales_closed': item.sales_closed
        }, status=201)
    
    return HttpResponseNotAllowed(['GET', 'POST'])

@csrf_exempt
def food_item_detail(request, item_id):
    """Handles updating (PUT) and deleting (DELETE) a single food item."""
    item = get_object_or_404(FoodItem, pk=item_id)

    if request.method == 'PUT':
        data = json.loads(request.body)
        item.quantity_sold = data.get('quantity_sold', item.quantity_sold)
        item.save()
        return JsonResponse({
            'id': item.id,
            'name': item.name,
            'date': item.date,
            'time_slot': item.time_slot,
            'quantity_prepared': item.quantity_prepared,
            'quantity_sold': item.quantity_sold,
            'quantity_wasted': item.quantity_wasted,
            'price': item.price,
            'sales_closed': item.sales_closed
        })

    elif request.method == 'DELETE':
        item.delete()
        return JsonResponse({'message': 'Item deleted successfully'}, status=204)

    return HttpResponseNotAllowed(['PUT', 'DELETE'])

@csrf_exempt
@require_POST
def close_sales(request):
    # Mark all unsold as wasted and lock sales
    for item in FoodItem.objects.all():
        item.quantity_sold = min(item.quantity_sold, item.quantity_prepared)
        item.sales_closed = True
        item.save()
    return JsonResponse({'message': 'Sales closed. All unsold marked as wasted.'})

@csrf_exempt
@require_POST
def start_new_sales(request):
    # Delete all food items to start fresh
    FoodItem.objects.all().delete()
    return JsonResponse({'message': 'New sales session started. All items cleared.'})
