// Team Reliability Ranking Visualization (Stacked Bar Chart)

document.addEventListener('DOMContentLoaded', function() {
    // Check if D3 is loaded
    if (typeof d3 === 'undefined') {
        console.error('D3 library is not loaded! Loading from CDN...');
        
        // Try to load D3 from CDN if not available
        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.onload = function() {
            console.log('D3 library loaded from CDN');
            createTeamReliabilityChart();
        };
        script.onerror = function() {
            console.error('Failed to load D3 from CDN');
            displayError('team-reliability-ranking');
        };
        document.head.appendChild(script);
    } else {
        console.log('D3 library is already loaded');
        createTeamReliabilityChart();
    }
});

function displayError(containerId) {
    const vizContainer = document.querySelector(`#${containerId} .viz-content`);
    if (vizContainer) {
        vizContainer.innerHTML = '<div class="error-message" style="color: #e10600; text-align: center; padding: 20px;">Failed to load visualization</div>';
    }
}

function createTeamReliabilityChart() {
    try {
        // Check for D3 again just to be safe
        if (typeof d3 === 'undefined') {
            console.error('D3 is still not available');
            displayError('team-reliability-ranking');
            return;
        }
        
        const card = document.getElementById('team-reliability-ranking');
        const vizContainer = card.querySelector('.viz-content');
        if (!vizContainer) {
            console.error('Visualization container not found');
            return;
        }
        
        // Check if we're in expanded view and adjust dimensions accordingly
        const isExpanded = card.classList.contains('expanded-view');
        
        // Set dimensions and margins
        const margin = {top: 50, right: isExpanded ? 140 : 80, bottom: 70, left: isExpanded ? 60 : 50};
        const width = vizContainer.clientWidth - margin.left - margin.right;
        const height = vizContainer.clientHeight - margin.top - margin.bottom;
        
        // Clear any existing SVG
        d3.select(vizContainer).selectAll("*").remove();
        
        // Create SVG with responsive sizing
        const svg = d3.select(vizContainer)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
        
        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", isExpanded ? "20px" : "16px")
            .style("font-weight", "bold")
            .style("fill", "#ffffff")
            .text("Team Reliability Ranking (DNFs by Team)");
        
        // Load and process data
        fetch('/api/team-reliability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filters: {
                    season: 'all',
                    team: 'all',
                    selectedYears: ["2020", "2021", "2022", "2023", "2024"],
                    limit: 10
                }
            })
        })
        .then(response => response.json())
        .then(response => {
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to load data');
            }
            
            const { teams: teamData, statistics } = response.data;
            
            // Set up scales
            const xScale = d3.scaleBand()
                .domain(teamData.map(d => d.team))
                .range([0, width])
                .padding(0.2);
            
            const yScale = d3.scaleLinear()
                .domain([0, d3.max(teamData, d => d.total) * 1.1]) // Add 10% padding
                .range([height, 0]);
            
            // Set up a color scale for different years
            const colorScale = d3.scaleOrdinal()
                .domain(statistics.years)
                .range(["#e10600", "#ff5a4d", "#ff8d85", "#ffbdb8", "#ffd2cd"]);
            
            // Create the stacked data
            const stackedData = d3.stack()
                .keys(statistics.years)
                (teamData);
            
            // Create tooltip
            const tooltip = d3.select(vizContainer)
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)
                .style("position", "absolute")
                .style("background", "#15151e")
                .style("border", "1px solid #e10600")
                .style("border-radius", "4px")
                .style("padding", "10px")
                .style("color", "#ffffff")
                .style("pointer-events", "none")
                .style("width", "auto");
            
            // Add bars for each year
            svg.append("g")
                .selectAll("g")
                .data(stackedData)
                .enter()
                .append("g")
                .attr("fill", (d, i) => colorScale(statistics.years[i]))
                .selectAll("rect")
                .data(d => d)
                .enter()
                .append("rect")
                .attr("x", d => xScale(d.data.team))
                .attr("y", d => yScale(d[1]))
                .attr("height", d => yScale(d[0]) - yScale(d[1]))
                .attr("width", xScale.bandwidth())
                .attr("stroke", "#2a2a2a")
                .attr("stroke-width", 1)
                .on("mouseover", function(event, d) {
                    const yearIndex = this.parentNode.__data__.index;
                    const year = statistics.years[yearIndex];
                    const count = d[1] - d[0];
                    
                    const [mouseX, mouseY] = d3.pointer(event, vizContainer);
                    
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    
                    tooltip.html(`
                        <strong>Team:</strong> ${formatTeamName(d.data.team)}<br>
                        <strong>Year:</strong> ${year}<br>
                        <strong>DNFs:</strong> ${count}<br>
                        <strong>Total DNFs:</strong> ${d.data.total}<br>
                        <strong>Avg DNFs/Year:</strong> ${d.data.avgDNFsPerYear}
                    `)
                    .style("left", (mouseX + 10) + "px")
                    .style("top", (mouseY - 15) + "px");
                    
                    d3.select(this)
                        .style("stroke", "#ffffff")
                        .style("stroke-width", "2px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                    
                    d3.select(this)
                        .style("stroke", "#2a2a2a")
                        .style("stroke-width", "1px");
                });
            
            // Add X axis
            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(xScale)
                    .tickFormat(d => formatTeamName(d)))
                .selectAll("text")
                .style("fill", "#cccccc")
                .style("font-size", "12px")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em");
            
            // Add Y axis
            svg.append("g")
                .call(d3.axisLeft(yScale).ticks(5))
                .selectAll("text")
                .style("fill", "#cccccc")
                .style("font-size", "12px");
            
            // Add statistics text
            svg.append("text")
                .attr("class", "statistics-text")
                .attr("x", width + 20)
                .attr("y", height - 60)
                .attr("fill", "#ffffff")
                .style("font-size", "12px")
                .html(`
                    <tspan x="${width + 20}" dy="0">Total DNFs: ${statistics.totalDNFs}</tspan>
                    <tspan x="${width + 20}" dy="20">Avg DNFs/Team: ${statistics.avgDNFsPerTeam}</tspan>
                    <tspan x="${width + 20}" dy="20">Teams Shown: ${statistics.totalTeams}</tspan>
                `);
            
            // Add legend
            const legend = svg.append("g")
                .attr("font-size", "12px")
                .attr("text-anchor", "start")
                .selectAll("g")
                .data(statistics.years)
                .enter()
                .append("g")
                .attr("transform", (d, i) => `translate(${width + 20}, ${i * 20})`);
            
            legend.append("rect")
                .attr("x", 0)
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", d => colorScale(d));
            
            legend.append("text")
                .attr("x", 20)
                .attr("y", 12.5)
                .attr("fill", "#ffffff")
                .text(d => d);
            
            // Add filters
            function updateChart() {
                const selectedTeam = d3.select("#team-filter").property("value");
                const selectedSeason = d3.select("#season-filter").property("value");
                
                console.log("Filtering by team:", selectedTeam, "and season:", selectedSeason);
                
                // Prepare filter object for POST request
                const filters = {
                    season: selectedSeason,
                    team: selectedTeam,
                    selectedYears: ["2020", "2021", "2022", "2023", "2024"],
                    limit: 10
                };
                
                // Fetch filtered data using POST
                fetch('/api/team-reliability', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ filters })
                })
                .then(response => response.json())
                .then(response => {
                    if (response.status !== 'success') {
                        throw new Error(response.message || 'Failed to load filtered data');
                    }
                    
                    const { teams: filteredData, statistics } = response.data;
                    
                    if (filteredData.length > 0) {
                        // Clear existing visualization
                        svg.selectAll("*").remove();
                        
                        // Update scales with new data
                        xScale.domain(filteredData.map(d => d.team));
                        yScale.domain([0, d3.max(filteredData, d => d.total) * 1.1]);
                        
                        // Create new stacked data
                        const newStackedData = d3.stack()
                            .keys(statistics.years)
                            (filteredData);
                        
                        // Add bars for each year
                        svg.append("g")
                            .selectAll("g")
                            .data(newStackedData)
                            .enter()
                            .append("g")
                            .attr("fill", (d, i) => colorScale(statistics.years[i]))
                            .selectAll("rect")
                            .data(d => d)
                            .enter()
                            .append("rect")
                            .attr("x", d => xScale(d.data.team))
                            .attr("y", d => yScale(d[1]))
                            .attr("height", d => yScale(d[0]) - yScale(d[1]))
                            .attr("width", xScale.bandwidth())
                            .attr("stroke", "#2a2a2a")
                            .attr("stroke-width", 1)
                            .on("mouseover", function(event, d) {
                                const yearIndex = this.parentNode.__data__.index;
                                const year = statistics.years[yearIndex];
                                const count = d[1] - d[0];
                                
                                const [mouseX, mouseY] = d3.pointer(event, vizContainer);
                                
                                tooltip.transition()
                                    .duration(200)
                                    .style("opacity", 0.9);
                                
                                tooltip.html(`
                                    <strong>Team:</strong> ${formatTeamName(d.data.team)}<br>
                                    <strong>Year:</strong> ${year}<br>
                                    <strong>DNFs:</strong> ${count}<br>
                                    <strong>Total DNFs:</strong> ${d.data.total}<br>
                                    <strong>Avg DNFs/Year:</strong> ${d.data.avgDNFsPerYear}
                                `)
                                .style("left", (mouseX + 10) + "px")
                                .style("top", (mouseY - 15) + "px");
                                
                                d3.select(this)
                                    .style("stroke", "#ffffff")
                                    .style("stroke-width", "2px");
                            })
                            .on("mouseout", function() {
                                tooltip.transition()
                                    .duration(500)
                                    .style("opacity", 0);
                                
                                d3.select(this)
                                    .style("stroke", "#2a2a2a")
                                    .style("stroke-width", "1px");
                            });
                        
                        // Add X axis
                        svg.append("g")
                            .attr("transform", `translate(0, ${height})`)
                            .call(d3.axisBottom(xScale)
                                .tickFormat(d => formatTeamName(d)))
                            .selectAll("text")
                            .style("fill", "#cccccc")
                            .style("font-size", "12px")
                            .attr("transform", "rotate(-45)")
                            .style("text-anchor", "end")
                            .attr("dx", "-.8em")
                            .attr("dy", ".15em");
                        
                        // Add Y axis
                        svg.append("g")
                            .call(d3.axisLeft(yScale).ticks(5))
                            .selectAll("text")
                            .style("fill", "#cccccc")
                            .style("font-size", "12px");
                        
                        // Add statistics text
                        svg.append("text")
                            .attr("class", "statistics-text")
                            .attr("x", width + 20)
                            .attr("y", height - 60)
                            .attr("fill", "#ffffff")
                            .style("font-size", "12px")
                            .html(`
                                <tspan x="${width + 20}" dy="0">Total DNFs: ${statistics.totalDNFs}</tspan>
                                <tspan x="${width + 20}" dy="20">Avg DNFs/Team: ${statistics.avgDNFsPerTeam}</tspan>
                                <tspan x="${width + 20}" dy="20">Teams Shown: ${statistics.totalTeams}</tspan>
                            `);
                        
                        // Add legend
                        const legend = svg.append("g")
                            .attr("font-size", "12px")
                            .attr("text-anchor", "start")
                            .selectAll("g")
                            .data(statistics.years)
                            .enter()
                            .append("g")
                            .attr("transform", (d, i) => `translate(${width + 20}, ${i * 20})`);
                        
                        legend.append("rect")
                            .attr("x", 0)
                            .attr("width", 15)
                            .attr("height", 15)
                            .attr("fill", d => colorScale(d));
                        
                        legend.append("text")
                            .attr("x", 20)
                            .attr("y", 12.5)
                            .attr("fill", "#ffffff")
                            .text(d => d);
                        
                    } else {
                        // No data for this filter combination
                        svg.append("text")
                            .attr("x", width / 2)
                            .attr("y", height / 2)
                            .attr("text-anchor", "middle")
                            .style("fill", "#e10600")
                            .text("No data available for selected filters");
                    }
                })
                .catch(error => {
                    console.error("Error loading filtered data:", error);
                    svg.append("text")
                        .attr("x", width / 2)
                        .attr("y", height / 2)
                        .attr("text-anchor", "middle")
                        .style("fill", "#e10600")
                        .text("Error loading filtered data");
                });
            }
            
            // Add filter listeners
            d3.select("#season-filter").on("change", updateChart);
            d3.select("#team-filter").on("change", updateChart);
            d3.select(".dashboard-button").on("click", updateChart);
            
        }).catch(function(error) {
            console.error("Error loading or processing the data:", error);
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .style("fill", "#e10600")
                .text("Error loading data");
        });
        
    } catch (error) {
        console.error("Error creating chart:", error);
        displayError('team-reliability-ranking');
    }
}

// Helper function to format constructor IDs into readable team names
function formatTeamName(constructorId) {
    // Map of constructor IDs to display names
    const teamNames = {
        "red-bull": "Red Bull",
        "mercedes": "Mercedes",
        "ferrari": "Ferrari",
        "mclaren": "McLaren",
        "aston-martin": "Aston Martin",
        "alpine": "Alpine",
        "williams": "Williams",
        "alphatauri": "AlphaTauri",
        "alfa-romeo": "Alfa Romeo",
        "haas": "Haas",
        "racing-point": "Racing Point",
        "renault": "Renault",
        "toro-rosso": "Toro Rosso",
        "force-india": "Force India"
    };
    
    return teamNames[constructorId] || constructorId;
}

// Handle window resize to make the chart responsive
window.addEventListener("resize", function() {
    if (typeof d3 !== 'undefined') {
        createTeamReliabilityChart();
    }
}); 