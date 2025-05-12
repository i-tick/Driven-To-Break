document.addEventListener('DOMContentLoaded', function() {
    // Find all team cards
    const teamCards = document.querySelectorAll('.team-card');

    // Add click event to each card to make it expandable
    teamCards.forEach(card => {
        card.addEventListener('click', function() {
            const isExpanded = this.classList.contains('expanded');
            
            // First collapse all cards
            teamCards.forEach(c => c.classList.remove('expanded'));
            
            // Then expand the clicked one if it wasn't already expanded
            if (!isExpanded) {
                this.classList.add('expanded');
            }
        });
    });

    // Add sample chart data for each team
    renderTeamCharts();
});

function renderTeamCharts() {
    // Sample data for team DNF breakdown by year
    const teamData = {
        'mercedes': [
            {year: 2015, dnfRate: 14.5},
            {year: 2016, dnfRate: 11.2},
            {year: 2017, dnfRate: 16.8},
            {year: 2018, dnfRate: 10.5},
            {year: 2019, dnfRate: 9.3},
            {year: 2020, dnfRate: 15.4},
            {year: 2021, dnfRate: 13.7},
            {year: 2022, dnfRate: 18.6},
            {year: 2023, dnfRate: 25.1},
            {year: 2024, dnfRate: 27.4}
        ],
        'red-bull': [
            {year: 2015, dnfRate: 19.2},
            {year: 2016, dnfRate: 21.3},
            {year: 2017, dnfRate: 35.2},
            {year: 2018, dnfRate: 24.1},
            {year: 2019, dnfRate: 10.8},
            {year: 2020, dnfRate: 13.9},
            {year: 2021, dnfRate: 12.2},
            {year: 2022, dnfRate: 9.5},
            {year: 2023, dnfRate: 6.3},
            {year: 2024, dnfRate: 14.1}
        ],
        'ferrari': [
            {year: 2015, dnfRate: 12.4},
            {year: 2016, dnfRate: 18.9},
            {year: 2017, dnfRate: 15.7},
            {year: 2018, dnfRate: 16.2},
            {year: 2019, dnfRate: 19.8},
            {year: 2020, dnfRate: 15.1},
            {year: 2021, dnfRate: 11.4},
            {year: 2022, dnfRate: 16.3},
            {year: 2023, dnfRate: 10.2},
            {year: 2024, dnfRate: 9.7}
        ],
        'mclaren': [
            {year: 2015, dnfRate: 28.7},
            {year: 2016, dnfRate: 25.4},
            {year: 2017, dnfRate: 21.6},
            {year: 2018, dnfRate: 16.3},
            {year: 2019, dnfRate: 9.8},
            {year: 2020, dnfRate: 8.5},
            {year: 2021, dnfRate: 7.3},
            {year: 2022, dnfRate: 12.1},
            {year: 2023, dnfRate: 5.8},
            {year: 2024, dnfRate: 4.9}
        ],
        'alpine': [
            {year: 2015, dnfRate: 15.4},
            {year: 2016, dnfRate: 18.2},
            {year: 2017, dnfRate: 19.7},
            {year: 2018, dnfRate: 21.4},
            {year: 2019, dnfRate: 24.3},
            {year: 2020, dnfRate: 15.8},
            {year: 2021, dnfRate: 17.2},
            {year: 2022, dnfRate: 18.9},
            {year: 2023, dnfRate: 25.3},
            {year: 2024, dnfRate: 19.6}
        ],
        'aston-martin': [
            {year: 2015, dnfRate: 22.1},
            {year: 2016, dnfRate: 20.8},
            {year: 2017, dnfRate: 19.3},
            {year: 2018, dnfRate: 17.6},
            {year: 2019, dnfRate: 16.4},
            {year: 2020, dnfRate: 14.2},
            {year: 2021, dnfRate: 16.8},
            {year: 2022, dnfRate: 19.5},
            {year: 2023, dnfRate: 12.4},
            {year: 2024, dnfRate: 13.9}
        ]
    };

    // For each team card, add a simple bar chart
    document.querySelectorAll('.team-card').forEach(card => {
        // Determine which team this is
        const teamClasses = Array.from(card.classList).filter(cls => 
            teamData.hasOwnProperty(cls)
        );
        
        if (teamClasses.length > 0) {
            const teamName = teamClasses[0];
            const chartContainer = card.querySelector('.team-chart-container');
            
            if (chartContainer && teamData[teamName]) {
                const data = teamData[teamName];
                renderChart(chartContainer, data, teamName);
            }
        }
    });
}

function renderChart(container, data, teamName) {
    // Use D3 to create a simple bar chart
    const width = container.clientWidth;
    const height = 120;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };

    // Clear any existing content
    d3.select(container).html("");

    // Create the SVG
    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "team-chart");

    // Define scales
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.year))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.dnfRate) * 1.1])
        .range([height - margin.bottom, margin.top]);

    // Draw bars
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.year))
        .attr("y", d => yScale(d.dnfRate))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - margin.bottom - yScale(d.dnfRate))
        .attr("fill", getTeamColor(teamName));

    // Add the x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale)
            .tickValues(xScale.domain().filter(d => d % 2 === 0)) // Show every other year
        )
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    // Add the y-axis
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d + "%"));

    // Add title
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", margin.top)
        .attr("text-anchor", "middle")
        .text("DNF Rate by Year");
}

function getTeamColor(team) {
    const colors = {
        'mercedes': '#00D2BE',
        'red-bull': '#0600EF',
        'ferrari': '#DC0000',
        'mclaren': '#FF8700',
        'alpine': '#0090FF',
        'aston-martin': '#006F62'
    };
    
    return colors[team] || '#666666';
} 