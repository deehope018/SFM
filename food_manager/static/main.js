document.addEventListener('DOMContentLoaded', function() {
    const API_URL = '/api/food_items';
    const CLOSE_SALES_URL = '/api/close_sales';
    const START_NEW_SALES_URL = '/api/start_new_sales';
    const form = document.getElementById('add-item-form');
    const tableBody = document.querySelector('#food-items-table tbody');
    const dailyReportBtn = document.getElementById('daily-report-btn');
    const closeSalesBtn = document.getElementById('close-sales-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const reportModal = document.getElementById('report-modal');
    const reportContent = document.getElementById('report-content');
    const closeModalBtn = document.getElementById('close-modal');
    const unsoldWastedHeader = document.getElementById('unsold-wasted-header');

    let allItems = [];
    let salesClosed = false;
    let barChartInstance = null;
    let pieChartInstance = null;

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
            salesClosed = items.length > 0 && items.every(item => item.sales_closed);
            renderTable(items);
            updateUIState();
        } catch (error) {
            console.error('Error fetching food items:', error);
            dailyReportBtn.disabled = true;
        }
    }

    function updateUIState() {
        if (salesClosed) {
            closeSalesBtn.textContent = 'Start New Sales';
            unsoldWastedHeader.textContent = 'Wasted';
            form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
        } else {
            closeSalesBtn.textContent = 'Close Sales';
            unsoldWastedHeader.textContent = 'Unsold';
            form.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
        }
    }

    function renderTable(items) {
        tableBody.innerHTML = '';
        items.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.id = item.id;
            const remaining = item.quantity_prepared - item.quantity_sold;
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.date}</td>
                <td>${item.time_slot}</td>
                <td class="quantity-prepared">${item.quantity_prepared}</td>
                <td class="quantity-sold">${item.quantity_sold}</td>
                <td class="quantity-wasted">${salesClosed ? item.quantity_wasted : (item.quantity_prepared - item.quantity_sold)}</td>
                <td>${item.price.toFixed(2)}</td>
                <td class="actions">
                    <button class="sell-btn" data-id="${item.id}" ${salesClosed || remaining === 0 ? 'disabled' : ''}>Sell</button>
                    <button class="delete-btn" data-id="${item.id}" ${salesClosed ? 'disabled' : ''}>Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- Add a new food item ---
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        if (salesClosed) return;
        const newItem = {
            name: document.getElementById('name').value,
            date: document.getElementById('date').value || new Date().toISOString().slice(0, 10),
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
            fetchFoodItems();
        } catch (error) {
            console.error('Error adding item:', error);
        }
    });

    // --- Sell or Delete an item (using event delegation) ---
    tableBody.addEventListener('click', async function(event) {
        const target = event.target;
        const id = target.dataset.id;
        if (!id || salesClosed) return;
        
        // Handle Delete
        if (target.classList.contains('delete-btn')) {
            if (!confirm('Are you sure you want to delete this item?')) return;
            try {
                const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete item');
                fetchFoodItems();
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }

        // Handle Sell
        if (target.classList.contains('sell-btn')) {
            const row = target.closest('tr');
            document.querySelectorAll('.inline-sell-box').forEach(el => el.remove());
            if (row.querySelector('.inline-sell-box')) return;
            const soldCell = row.querySelector('.quantity-sold');
            const preparedCell = row.querySelector('.quantity-prepared');
            const wastedCell = row.querySelector('.quantity-wasted');
            let currentSold = parseInt(soldCell.textContent, 10);
            const quantityPrepared = parseInt(preparedCell.textContent, 10);
            const remaining = quantityPrepared - currentSold;
            if (remaining === 0) return;
            const box = document.createElement('span');
            box.className = 'inline-sell-box';
            box.innerHTML = `
                <input type="number" class="inline-sell-input" min="1" max="${remaining}" value="1" style="width:60px; margin-left:8px;">
                <button class="confirm-sell-btn" data-id="${id}">Confirm</button>
            `;
            target.parentNode.insertBefore(box, target.nextSibling);
        }
        // Handle Confirm Sell
        if (target.classList.contains('confirm-sell-btn')) {
            const row = target.closest('tr');
            const soldCell = row.querySelector('.quantity-sold');
            const preparedCell = row.querySelector('.quantity-prepared');
            const wastedCell = row.querySelector('.quantity-wasted');
            let currentSold = parseInt(soldCell.textContent, 10);
            const quantityPrepared = parseInt(preparedCell.textContent, 10);
            const remaining = quantityPrepared - currentSold;
            const input = row.querySelector('.inline-sell-input');
            let sellQty = parseInt(input.value, 10);
            if (isNaN(sellQty) || sellQty < 1 || sellQty > remaining) {
                alert(`Please enter a valid quantity to sell (1-${remaining})`);
                return;
            }
            let newQuantitySold = currentSold + sellQty;
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity_sold: newQuantitySold })
                });
                if (!response.ok) throw new Error('Failed to update item');
                soldCell.textContent = newQuantitySold;
                wastedCell.textContent = quantityPrepared - newQuantitySold;
                row.querySelector('.inline-sell-box').remove();
                if (newQuantitySold >= quantityPrepared) {
                    row.querySelector('.sell-btn').disabled = true;
                }
            } catch (error) {
                console.error('Error selling item:', error);
            }
        }
    });

    // --- Close Sales / Start New Sales ---
    closeSalesBtn.addEventListener('click', async function() {
        if (!salesClosed) {
            // Close sales
            if (!confirm('Are you sure you want to close sales? This will mark all unsold as wasted and lock sales.')) return;
            try {
                const response = await fetch(CLOSE_SALES_URL, { method: 'POST' });
                if (!response.ok) throw new Error('Failed to close sales');
                fetchFoodItems();
            } catch (error) {
                alert('Error closing sales.');
            }
        } else {
            // Start new sales
            if (!confirm('Start new sales? This will clear all food items and reset everything.')) return;
            try {
                const response = await fetch(START_NEW_SALES_URL, { method: 'POST' });
                if (!response.ok) throw new Error('Failed to start new sales');
                form.reset();
                fetchFoodItems();
            } catch (error) {
                alert('Error starting new sales.');
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
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        const todayItems = allItems.filter(item => {
            const itemDate = new Date(item.date);
            const itemDateStr = itemDate.getFullYear() + '-' + String(itemDate.getMonth() + 1).padStart(2, '0') + '-' + String(itemDate.getDate()).padStart(2, '0');
            return itemDateStr === todayStr;
        });
        showReport('Daily Report', todayItems, todayStr);
    });

    // --- Show Report Modal with Charts and CSV Export ---
    function showReport(title, items, dateLabel) {
        if (!items.length) {
            reportContent.innerHTML = `<h2>${title}</h2><p>No data available.</p>`;
            openModal();
            return;
        }
        let totalSold = 0, totalUnsold = 0, totalWasted = 0, totalSales = 0;
        const labels = [], soldData = [], unsoldData = [], wastedData = [], salesData = [];
        items.forEach(item => {
            const unsold = item.quantity_prepared - item.quantity_sold;
            totalSold += item.quantity_sold;
            totalUnsold += unsold;
            totalWasted += item.quantity_wasted;
            totalSales += item.quantity_sold * item.price;
            labels.push(item.name);
            soldData.push(item.quantity_sold);
            unsoldData.push(unsold);
            wastedData.push(item.quantity_wasted);
            salesData.push(item.quantity_sold * item.price);
        });
        let tableHtml = `<h2>${title}${dateLabel ? ' ('+dateLabel+')' : ''}</h2>`;
        tableHtml += `<table style="margin:0 auto;max-width:90%;"><thead><tr><th>Name</th><th>Sold</th><th>${salesClosed ? 'Wasted' : 'Unsold'}</th><th>Price (₹)</th><th>Sales (₹)</th></tr></thead><tbody>`;
        items.forEach(item => {
            const unsold = item.quantity_prepared - item.quantity_sold;
            tableHtml += `<tr><td>${item.name}</td><td>${item.quantity_sold}</td><td>${salesClosed ? item.quantity_wasted : unsold}</td><td>${item.price.toFixed(2)}</td><td>${(item.quantity_sold * item.price).toFixed(2)}</td></tr>`;
        });
        tableHtml += `</tbody></table>`;
        tableHtml += `<p style="margin-top:1rem;"><b>Total Sold:</b> ${totalSold} &nbsp; <b>Total ${salesClosed ? 'Wasted' : 'Unsold'}:</b> ${salesClosed ? totalWasted : totalUnsold} &nbsp; <b>Total Sales:</b> ₹${totalSales.toFixed(2)}</p>`;
        tableHtml += `<canvas id="barChart" height="120"></canvas><canvas id="pieChart" height="120"></canvas>`;
        tableHtml += `<button id="export-csv-btn" style="margin-top:1rem;">Export as CSV</button>`;
        reportContent.innerHTML = tableHtml;
        openModal();
        setTimeout(() => {
            drawBarChart(labels, soldData, salesClosed ? wastedData : unsoldData);
            drawPieChart(labels, salesData);
        }, 100);
        document.getElementById('export-csv-btn').onclick = function() {
            exportCSV(title, items, dateLabel);
        };
    }

    // --- Chart.js Bar Chart ---
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
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Name,Date,Time Slot,Prepared,Sold,Wasted,Price,Sales\r\n";
        items.forEach(item => {
            const wasted = item.quantity_prepared - item.quantity_sold;
            const sales = item.quantity_sold * item.price;
            csvContent += `${item.name},${item.date},${item.time_slot},${item.quantity_prepared},${item.quantity_sold},${wasted},${item.price.toFixed(2)},${sales.toFixed(2)}\r\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const filename = `${title.replace(' ', '_')}${dateLabel ? '_'+dateLabel : ''}.csv`;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Initial load of food items
    fetchFoodItems();
}); 