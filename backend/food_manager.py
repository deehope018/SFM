import sys
import os
import sqlite3
from PyQt5.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QLineEdit, QLabel, QMessageBox, QSpinBox, QDoubleSpinBox, QComboBox, QDateEdit
)
from PyQt5.QtCore import Qt, QDate

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'food.db')

class FoodManager(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Food Manager')
        self.resize(900, 500)
        self.conn = sqlite3.connect(DB_PATH)
        self.init_ui()
        self.load_data()

    def init_ui(self):
        layout = QVBoxLayout()
        self.table = QTableWidget()
        self.table.setColumnCount(7)
        self.table.setHorizontalHeaderLabels([
            'Name', 'Date', 'Time Slot', 'Qty Prepared', 'Qty Sold', 'Qty Wasted', 'Price'
        ])
        self.table.setSelectionBehavior(self.table.SelectRows)
        self.table.setEditTriggers(self.table.NoEditTriggers)
        self.table.cellClicked.connect(self.on_row_selected)
        layout.addWidget(self.table)

        # Form for add/update
        form_layout = QHBoxLayout()
        self.name_input = QLineEdit()
        self.date_input = QDateEdit()
        self.date_input.setCalendarPopup(True)
        self.date_input.setDate(QDate.currentDate())
        self.time_slot_input = QComboBox()
        self.time_slot_input.addItems(['Breakfast', 'Lunch', 'Snacks', 'Dinner'])
        self.qty_prepared_input = QSpinBox()
        self.qty_prepared_input.setRange(0, 10000)
        self.qty_sold_input = QSpinBox()
        self.qty_sold_input.setRange(0, 10000)
        self.price_input = QDoubleSpinBox()
        self.price_input.setRange(0, 10000)
        self.price_input.setDecimals(2)

        for label, widget in [
            ('Name', self.name_input),
            ('Date', self.date_input),
            ('Time Slot', self.time_slot_input),
            ('Qty Prepared', self.qty_prepared_input),
            ('Qty Sold', self.qty_sold_input),
            ('Price', self.price_input)
        ]:
            form_layout.addWidget(QLabel(label))
            form_layout.addWidget(widget)
        layout.addLayout(form_layout)

        # Buttons
        btn_layout = QHBoxLayout()
        self.add_btn = QPushButton('Add')
        self.update_btn = QPushButton('Update')
        self.delete_btn = QPushButton('Delete')
        self.refresh_btn = QPushButton('Refresh')
        btn_layout.addWidget(self.add_btn)
        btn_layout.addWidget(self.update_btn)
        btn_layout.addWidget(self.delete_btn)
        btn_layout.addWidget(self.refresh_btn)
        layout.addLayout(btn_layout)

        self.setLayout(layout)

        self.add_btn.clicked.connect(self.add_item)
        self.update_btn.clicked.connect(self.update_item)
        self.delete_btn.clicked.connect(self.delete_item)
        self.refresh_btn.clicked.connect(self.load_data)

        self.selected_id = None

    def load_data(self):
        cur = self.conn.cursor()
        cur.execute('SELECT id, name, date, time_slot, quantity_prepared, quantity_sold, price FROM food_items')
        rows = cur.fetchall()
        self.table.setRowCount(len(rows))
        for row_idx, row in enumerate(rows):
            id_, name, date, time_slot, qty_prepared, qty_sold, price = row
            qty_wasted = qty_prepared - qty_sold
            for col, value in enumerate([name, date, time_slot, qty_prepared, qty_sold, qty_wasted, price]):
                self.table.setItem(row_idx, col, QTableWidgetItem(str(value)))
            self.table.setRowHeight(row_idx, 20)
        self.selected_id = None
        self.table.clearSelection()
        self.clear_form()

    def clear_form(self):
        self.name_input.clear()
        self.date_input.setDate(QDate.currentDate())
        self.time_slot_input.setCurrentIndex(0)
        self.qty_prepared_input.setValue(0)
        self.qty_sold_input.setValue(0)
        self.price_input.setValue(0.0)

    def on_row_selected(self, row, col):
        cur = self.conn.cursor()
        name_item = self.table.item(row, 0)
        date_item = self.table.item(row, 1)
        name = name_item.text() if name_item is not None else ''
        date = date_item.text() if date_item is not None else ''
        cur.execute('SELECT id, name, date, time_slot, quantity_prepared, quantity_sold, price FROM food_items WHERE name=? AND date=?', (name, date))
        item = cur.fetchone()
        if item:
            self.selected_id = item[0]
            self.name_input.setText(item[1])
            self.date_input.setDate(QDate.fromString(item[2], 'yyyy-MM-dd'))
            idx = self.time_slot_input.findText(item[3])
            self.time_slot_input.setCurrentIndex(idx if idx >= 0 else 0)
            self.qty_prepared_input.setValue(item[4])
            self.qty_sold_input.setValue(item[5])
            self.price_input.setValue(item[6])

    def add_item(self):
        name = self.name_input.text().strip()
        date = self.date_input.date().toString('yyyy-MM-dd')
        time_slot = self.time_slot_input.currentText()
        qty_prepared = self.qty_prepared_input.value()
        qty_sold = self.qty_sold_input.value()
        price = self.price_input.value()
        if not name:
            QMessageBox.warning(self, 'Input Error', 'Name is required.')
            return
        cur = self.conn.cursor()
        cur.execute('INSERT INTO food_items (name, date, time_slot, quantity_prepared, quantity_sold, price) VALUES (?, ?, ?, ?, ?, ?)',
                    (name, date, time_slot, qty_prepared, qty_sold, price))
        self.conn.commit()
        self.load_data()

    def update_item(self):
        if self.selected_id is None:
            QMessageBox.warning(self, 'Selection Error', 'Select a row to update.')
            return
        name = self.name_input.text().strip()
        date = self.date_input.date().toString('yyyy-MM-dd')
        time_slot = self.time_slot_input.currentText()
        qty_prepared = self.qty_prepared_input.value()
        qty_sold = self.qty_sold_input.value()
        price = self.price_input.value()
        cur = self.conn.cursor()
        cur.execute('UPDATE food_items SET name=?, date=?, time_slot=?, quantity_prepared=?, quantity_sold=?, price=? WHERE id=?',
                    (name, date, time_slot, qty_prepared, qty_sold, price, self.selected_id))
        self.conn.commit()
        self.load_data()

    def delete_item(self):
        if self.selected_id is None:
            QMessageBox.warning(self, 'Selection Error', 'Select a row to delete.')
            return
        cur = self.conn.cursor()
        cur.execute('DELETE FROM food_items WHERE id=?', (self.selected_id,))
        self.conn.commit()
        self.load_data()

    def closeEvent(self, event):
        self.conn.close()
        event.accept()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = FoodManager()
    window.show()
    sys.exit(app.exec_()) 