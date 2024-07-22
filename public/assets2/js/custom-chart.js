(function ($) {
    "use strict";

    let chart;

    function initChart() {
        var ctx = document.getElementById('myChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Orders',
                    tension: 0.3,
                    fill: true,
                    backgroundColor: 'rgba(44, 120, 220, 0.2)',
                    borderColor: 'rgba(44, 120, 220)',
                    data: []
                },
                {
                    label: 'Revenue',
                    tension: 0.3,
                    fill: true,
                    backgroundColor: 'rgba(4, 209, 130, 0.2)',
                    borderColor: 'rgb(4, 209, 130)',
                    data: []
                }]
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            usePointStyle: true,
                        },
                    }
                }
            }
        });
    }

    function updateChartData(filter) {
        let labels = [], orderCounts = [], revenues = [];

        switch(filter) {
            case 'yearly':
                orderData.forEach(data => {
                    let year = data._id.split('-')[0];
                    let yearIndex = labels.indexOf(year);
                    if (yearIndex === -1) {
                        labels.push(year);
                        orderCounts.push(data.count);
                        revenues.push(data.revenue);
                    } else {
                        orderCounts[yearIndex] += data.count;
                        revenues[yearIndex] += data.revenue;
                    }
                });
                break;
            case 'monthly':
                orderData.forEach(data => {
                    let yearMonth = data._id.substring(0, 7);
                    let monthIndex = labels.indexOf(yearMonth);
                    if (monthIndex === -1) {
                        labels.push(yearMonth);
                        orderCounts.push(data.count);
                        revenues.push(data.revenue);
                    } else {
                        orderCounts[monthIndex] += data.count;
                        revenues[monthIndex] += data.revenue;
                    }
                });
                break;
            case 'weekly':
                
                orderData.slice(-7).forEach(data => {
                    labels.push(data._id);
                    orderCounts.push(data.count);
                    revenues.push(data.revenue);
                });
                break;
        }

        chart.data.labels = labels;
        chart.data.datasets[0].data = orderCounts;
        chart.data.datasets[1].data = revenues;
        chart.update();
    }

    $(document).ready(function() {
        if ($('#myChart').length) {
            initChart();
            updateChartData('yearly'); 

            $('#chartFilter').on('change', function() {
                updateChartData(this.value);
            });
        }
    });

})(jQuery);