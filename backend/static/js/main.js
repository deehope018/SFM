document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'http://127.0.0.1:5000/api/food_items';
    const form = document.getElementById('add-item-form');
    const tableBody = document.querySelector('#food-items-table tbody');
    const dailyReportBtn = document.getElementById('daily-report-btn');
    const weeklyAnalysisBtn = document.getElementById('weekly-analysis-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const reportModal = document.getElementById('report-modal');
    const reportContent = document.getElementById('report-content');
    const closeModalBtn = document.getElementById('close-modal');

    let allItems = [];

    // Set the date field to default to today
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // --- Fetch and display all food items ---
    async function fetchFoodItems() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            const items = await response.json();
            allItems = items;
            renderTable(items);
        } catch (error) {
            console.error('Error fetching food items:', error);
        }
    }

    function renderTable(items) {
        tableBody.innerHTML = '';
        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.date}</td>
                <td>${item.time_slot}</td>
                <td>${item.quantity_prepared}</td>
                <td><input type="number" class="quantity-sold-input" value="${item.quantity_sold}" min="0" max="${item.quantity_prepared}"></td>
                <td>${item.quantity_wasted}</td>
                <td>${item.price.toFixed(2)}</td>
                <td class="actions">
                    <button class="update-btn" data-id="${item.id}">Update</button>
                    <button class="delete-btn" data-id="${item.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- Add a new food item ---
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const newItem = {
            name: document.getElementById('name').value,
            date: document.getElementById('date').value,
            time_slot: document.getElementById('time_slot').value,
            quantity_prepared: parseInt(document.getElementById('quantity_prepared').value, 10),
            price: parseFloat(document.getElementById('price').value)
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            if (!response.ok) throw new Error('Failed to add item');
            
            form.reset();
            fetchFoodItems(); // Refresh the list
        } catch (error) {
            console.error('Error adding item:', error);
        }
    });

    // --- Update or Delete an item (using event delegation) ---
    tableBody.addEventListener('click', async function(event) {
        const target = event.target;
        const id = target.dataset.id;
        
        if (!id) return;

        // Handle Delete
        if (target.classList.contains('delete-btn')) {
            if (!confirm('Are you sure you want to delete this item?')) return;
            
            try {
                const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete item');
                fetchFoodItems(); // Refresh the list
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }

        // Handle Update
        if (target.classList.contains('update-btn')) {
            const row = target.closest('tr');
            const quantitySoldInput = row.querySelector('.quantity-sold-input');
            const newQuantitySold = parseInt(quantitySoldInput.value, 10);

            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity_sold: newQuantitySold })
                });
                if (!response.ok) throw new Error('Failed to update item');
                fetchFoodItems(); // Refresh the list
            } catch (error) {
                console.error('Error updating item:', error);
            }
        }
    });

    // --- Modal logic ---
    function openModal() {
        modalOverlay.style.display = 'block';
        reportModal.style.display = 'block';
    }
    function closeModal() {
        modalOverlay.style.display = 'none';
        reportModal.style.display = 'none';
        reportContent.innerHTML = '';
    }
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // --- Daily Report ---
    dailyReportBtn.addEventListener('click', function() {
        const today = new Date().toISOString().slice(0, 10);
        const todayItems = allItems.filter(item => item.date === today);
        showReport('Daily Report', todayItems, today);
    });

    // --- Weekly Analysis ---
    weeklyAnalysisBtn.addEventListener('click', function() {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 6); // last 7 days including today
        const weekItems = allItems.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= weekAgo && itemDate <= today;
        });
        showReport('Weekly Analysis', weekItems);
    });

    // --- Show Report Modal with Charts and CSV Export ---
    function showReport(title, items, dateLabel) {
        if (!items.length) {
            reportContent.innerHTML = `<h2>${title}</h2><p>No data available.</p>`;
            openModal();
            return;
        }
        // Calculate stats
        let totalSold = 0, totalWasted = 0, totalSales = 0;
        const labels = [], soldData = [], wastedData = [], salesData = [];
        items.forEach(item => {
            totalSold += item.quantity_sold;
            totalWasted += item.quantity_prepared - item.quantity_sold;
            totalSales += item.quantity_sold * item.price;
            labels.push(item.name);
            soldData.push(item.quantity_sold);
            wastedData.push(item.quantity_prepared - item.quantity_sold);
            salesData.push(item.quantity_sold * item.price);
        });
        // Table
        let tableHtml = `<h2>${title}${dateLabel ? ' ('+dateLabel+')' : ''}</h2>`;
        tableHtml += `<table style="margin:0 auto;max-width:90%;"><thead><tr><th>Name</th><th>Sold</th><th>Wasted</th><th>Price (₹)</th><th>Sales (₹)</th></tr></thead><tbody>`;
        items.forEach(item => {
            tableHtml += `<tr><td>${item.name}</td><td>${item.quantity_sold}</td><td>${item.quantity_prepared - item.quantity_sold}</td><td>${item.price.toFixed(2)}</td><td>${(item.quantity_sold * item.price).toFixed(2)}</td></tr>`;
        });
        tableHtml += `</tbody></table>`;
        tableHtml += `<p style="margin-top:1rem;"><b>Total Sold:</b> ${totalSold} &nbsp; <b>Total Wasted:</b> ${totalWasted} &nbsp; <b>Total Sales:</b> ₹${totalSales.toFixed(2)}</p>`;
        // Chart containers
        tableHtml += `<canvas id="barChart" height="120"></canvas><canvas id="pieChart" height="120"></canvas>`;
        // CSV Export
        tableHtml += `<button id="export-csv-btn" style="margin-top:1rem;">Export as CSV</button>`;
        reportContent.innerHTML = tableHtml;
        openModal();
        // Draw charts
        setTimeout(() => {
            drawBarChart(labels, soldData, wastedData);
            drawPieChart(labels, salesData);
        }, 100);
        // CSV Export
        document.getElementById('export-csv-btn').onclick = function() {
            exportCSV(title, items, dateLabel);
        };
    }

    // --- Chart.js Bar Chart ---
    let barChartInstance = null;
    function drawBarChart(labels, soldData, wastedData) {
        const ctx = document.getElementById('barChart').getContext('2d');
        if (barChartInstance) barChartInstance.destroy();
        barChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Sold',
                        data: soldData,
                        backgroundColor: 'rgba(67, 206, 162, 0.7)'
                    },
                    {
                        label: 'Wasted',
                        data: wastedData,
                        backgroundColor: 'rgba(231, 76, 60, 0.7)'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Sold vs Wasted' }
                }
            }
        });
    }
    // --- Chart.js Pie Chart ---
    let pieChartInstance = null;
    function drawPieChart(labels, salesData) {
        const ctx = document.getElementById('pieChart').getContext('2d');
        if (pieChartInstance) pieChartInstance.destroy();
        pieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales (₹)',
                    data: salesData,
                    backgroundColor: [
                        '#43cea2', '#185a9d', '#e74c3c', '#8f94fb', '#f4d03f', '#34495e', '#9b59b6', '#2ecc71'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Sales Distribution' }
                }
            }
        });
    }

    // --- CSV Export ---
    function exportCSV(title, items, dateLabel) {
        let csv = `${title}${dateLabel ? ' ('+dateLabel+')' : ''}\n`;
        csv += 'Name,Sold,Wasted,Price (₹),Sales (₹)\n';
        items.forEach(item => {
            csv += `${item.name},${item.quantity_sold},${item.quantity_prepared - item.quantity_sold},${item.price.toFixed(2)},${(item.quantity_sold * item.price).toFixed(2)}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_').toLowerCase()}${dateLabel ? '_' + dateLabel : ''}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Initial load of food items
    fetchFoodItems();
}); 