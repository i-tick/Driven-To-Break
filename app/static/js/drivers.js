document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const driverCards = document.querySelectorAll('.driver-card');
    const searchInput = document.getElementById('driver-search');
    const teamFilter = document.getElementById('driver-filter');
    
    // Add click event to each card to make it expandable
    driverCards.forEach(card => {
        card.addEventListener('click', function() {
            const isExpanded = this.classList.contains('expanded');
            
            // First collapse all cards
            driverCards.forEach(c => c.classList.remove('expanded'));
            
            // Then expand the clicked one if it wasn't already expanded
            if (!isExpanded) {
                this.classList.add('expanded');
            }
        });
    });
    
    // Add search functionality
    if (searchInput) {
        searchInput.addEventListener('input', filterDrivers);
    }
    
    // Add team filter functionality
    if (teamFilter) {
        teamFilter.addEventListener('change', filterDrivers);
    }
    
    // Function to filter drivers based on search input and team filter
    function filterDrivers() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedTeam = teamFilter ? teamFilter.value : 'all';
        
        driverCards.forEach(card => {
            const driverName = card.querySelector('h3').textContent.toLowerCase();
            const isTeamMatch = selectedTeam === 'all' || card.classList.contains(selectedTeam);
            const isSearchMatch = driverName.includes(searchTerm);
            
            if (isTeamMatch && isSearchMatch) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Initialize tooltip functionality for bar charts
    initializeTooltips();
});

function initializeTooltips() {
    const statBars = document.querySelectorAll('.stat-bar');
    
    statBars.forEach(statBar => {
        const barFill = statBar.querySelector('.bar-fill');
        const barContainer = statBar.querySelector('.bar-container');
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.style.display = 'none';
        statBar.appendChild(tooltip);
        
        // Show tooltip on hover
        barContainer.addEventListener('mouseenter', function(e) {
            const riskValue = parseInt(barFill.style.width);
            tooltip.textContent = `${riskValue}% risk`;
            tooltip.style.display = 'block';
            
            // Position tooltip
            const rect = barContainer.getBoundingClientRect();
            tooltip.style.left = `${rect.width * (riskValue / 100)}px`;
            tooltip.style.top = '-25px';
        });
        
        // Hide tooltip when mouse leaves
        barContainer.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
        });
    });
}

// Add driver DNF history charts
document.addEventListener('DOMContentLoaded', function() {
    // Sample data for driver DNF histories
    const dnfData = {
        'lewis-hamilton': [
            {season: 2015, dnfs: 1, collisions: 0},
            {season: 2016, dnfs: 2, collisions: 1},
            {season: 2017, dnfs: 0, collisions: 0},
            {season: 2018, dnfs: 2, collisions: 0},
            {season: 2019, dnfs: 0, collisions: 0},
            {season: 2020, dnfs: 1, collisions: 0},
            {season: 2021, dnfs: 2, collisions: 1},
            {season: 2022, dnfs: 1, collisions: 1},
            {season: 2023, dnfs: 3, collisions: 2},
            {season: 2024, dnfs: 1, collisions: 0}
        ],
        'max-verstappen': [
            {season: 2015, dnfs: 1, collisions: 0},
            {season: 2016, dnfs: 4, collisions: 1},
            {season: 2017, dnfs: 7, collisions: 2},
            {season: 2018, dnfs: 4, collisions: 2},
            {season: 2019, dnfs: 2, collisions: 1},
            {season: 2020, dnfs: 5, collisions: 2},
            {season: 2021, dnfs: 5, collisions: 3},
            {season: 2022, dnfs: 2, collisions: 0},
            {season: 2023, dnfs: 0, collisions: 0},
            {season: 2024, dnfs: 2, collisions: 0}
        ],
        'charles-leclerc': [
            {season: 2018, dnfs: 3, collisions: 2},
            {season: 2019, dnfs: 2, collisions: 1},
            {season: 2020, dnfs: 4, collisions: 1},
            {season: 2021, dnfs: 3, collisions: 1},
            {season: 2022, dnfs: 6, collisions: 1},
            {season: 2023, dnfs: 4, collisions: 2},
            {season: 2024, dnfs: 3, collisions: 1}
        ]
    };
    
    // Add click event to expand driver cards and show charts
    document.querySelectorAll('.driver-card').forEach(card => {
        card.addEventListener('click', function() {
            if (this.classList.contains('expanded')) {
                // If we have a driver ID, render their chart
                const driverName = this.querySelector('h3').textContent.toLowerCase().replace(' ', '-');
                if (dnfData[driverName]) {
                    // Create chart container if it doesn't exist
                    if (!this.querySelector('.driver-chart-container')) {
                        const chartContainer = document.createElement('div');
                        chartContainer.className = 'driver-chart-container';
                        this.appendChild(chartContainer);
                        
                        // Render the chart
                        renderDriverChart(chartContainer, dnfData[driverName]);
                    }
                }
            }
        });
    });
});

function renderDriverChart(container, data) {
    // Simple chart rendering logic would go here
    // For demonstration purposes only
    container.innerHTML = '<div class="chart-placeholder">Driver DNF History Chart<br>(Placeholder)</div>';
} 