from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # This will allow the frontend to make requests to our backend

# --- Database Configuration ---
# We are setting up the path for our SQLite database file.
# It will be created in an 'instance' folder within our 'backend' directory.
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'instance', 'food.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Database Model ---
# This class defines the structure of our 'food_items' table in the database.
class FoodItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    time_slot = db.Column(db.String(50), nullable=False)
    quantity_prepared = db.Column(db.Integer, nullable=False)
    quantity_sold = db.Column(db.Integer, default=0)
    price = db.Column(db.Float, nullable=False)

    # A helper method to convert our FoodItem object to a dictionary,
    # which is easy to convert to JSON for our API responses.
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'date': self.date,
            'time_slot': self.time_slot,
            'quantity_prepared': self.quantity_prepared,
            'quantity_sold': self.quantity_sold,
            'quantity_wasted': self.quantity_prepared - self.quantity_sold,
            'price': self.price
        }

# --- API Endpoints ---

# Renders the main HTML page
@app.route('/')
def index():
    return render_template('index.html')

# GET all food items
@app.route('/api/food_items', methods=['GET'])
def get_food_items():
    items = FoodItem.query.all()
    return jsonify([item.to_dict() for item in items])

# ADD a new food item
@app.route('/api/food_items', methods=['POST'])
def add_food_item():
    data = request.json
    new_item = FoodItem(
        name=data['name'],
        date=data['date'],
        time_slot=data['time_slot'],
        quantity_prepared=data['quantity_prepared'],
        price=data['price']
    )
    db.session.add(new_item)
    db.session.commit()
    return jsonify(new_item.to_dict()), 201

# UPDATE the quantity_sold of an item
@app.route('/api/food_items/<int:item_id>', methods=['PUT'])
def update_food_item(item_id):
    item = FoodItem.query.get_or_404(item_id)
    data = request.json
    item.quantity_sold = data.get('quantity_sold', item.quantity_sold)
    db.session.commit()
    return jsonify(item.to_dict())

# DELETE a food item
@app.route('/api/food_items/<int:item_id>', methods=['DELETE'])
def delete_food_item(item_id):
    item = FoodItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item deleted successfully'})

# --- Main Entry Point ---
# This block ensures that our Flask development server runs when we execute this file directly.
# The `db.create_all()` line is commented out for now. We will use a proper migration tool later.
if __name__ == '__main__':
    # with app.app_context():
    #     db.create_all()  # Create database tables for our models
    app.run(debug=True) 