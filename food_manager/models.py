from django.db import models

# Create your models here.

class FoodItem(models.Model):
    name = models.CharField(max_length=100)
    date = models.CharField(max_length=20)
    time_slot = models.CharField(max_length=50)
    quantity_prepared = models.IntegerField()
    quantity_sold = models.IntegerField(default=0)
    price = models.FloatField()
    sales_closed = models.BooleanField(default=False)

    @property
    def quantity_wasted(self):
        return self.quantity_prepared - self.quantity_sold

    def __str__(self):
        return f"{self.name} ({self.date} - {self.time_slot})"
