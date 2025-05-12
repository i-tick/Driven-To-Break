// Team Reliability Ranking Visualization (Stream Chart)

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
            .text("Team Reliability Trends (DNFs Over Time)");
        
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
                    selectedYears: ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],
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
            
            // Restructure data for stream chart
            const years = statistics.years;
            const teams = teamData.map(d => d.team);
            
            // Create stream data structure
            const streamData = [];
            years.forEach(year => {
                const yearData = { year };
                teamData.forEach(team => {
                    yearData[team.team] = team[year] || 0;
                });
                streamData.push(yearData);
            });
            
            // Set up scales
            const xScale = d3.scalePoint()
                .domain(years)
                .range([0, width])
                .padding(0.5);
            
            const yScale = d3.scaleLinear()
                .domain([0, d3.max(streamData, d => {
                    return d3.sum(teams, team => d[team] || 0);
                }) * 1.1]) // Add 10% padding
                .range([height, 0]);
            
            // Set up a color scale for different teams with shades of red and orange
            // to match the dashboard theme
            const redOrangeColors = [
                "#e10600", "#ff1a1a", "#ff4d4d", "#ff8080", "#ffb3b3",
                "#ff6600", "#ff8533", "#ffa366", "#ffc299", "#ffe0cc",
                "#cc0000", "#990000", "#660000", "#ff3300", "#cc2900"
            ];
            
            const colorScale = d3.scaleOrdinal()
                .domain(teams)
                .range(redOrangeColors);
            
            // Create the stack generator
            const stack = d3.stack()
                .keys(teams)
                .order(d3.stackOrderNone)
                .offset(d3.stackOffsetNone);
            
            const stackedData = stack(streamData);
            
            // Create the area generator
            const area = d3.area()
                .x(d => xScale(d.data.year))
                .y0(d => yScale(d[0]))
                .y1(d => yScale(d[1]))
                .curve(d3.curveBasis);
            
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
            
            // Add stream areas
            svg.selectAll(".stream-layer")
                .data(stackedData)
                .enter()
                .append("path")
                .attr("class", "stream-layer")
                .attr("d", area)
                .attr("fill", d => colorScale(d.key))
                .attr("stroke", "#2a2a2a")
                .attr("stroke-width", 0.5)
                .attr("opacity", 0.8)
                .on("mouseover", function(event, d) {
                    const team = d.key;
                    
                    d3.select(this)
                        .attr("stroke", "#ffffff")
                        .attr("stroke-width", "2px")
                        .attr("opacity", 1);
                    
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    
                    const [mouseX, mouseY] = d3.pointer(event, vizContainer);
                    
                    // Find the closest year to the mouse position
                    const xPos = d3.pointer(event)[0];
                    const yearIndex = Math.round((xPos / width) * (years.length - 1));
                    const year = years[yearIndex];
                    const dnfs = d[yearIndex].data[team] || 0;
                    
                    tooltip.html(`
                        <strong>Team:</strong> ${formatTeamName(team)}<br>
                        <strong>Year:</strong> ${year}<br>
                        <strong>DNFs:</strong> ${dnfs}<br>
                        <strong>Total DNFs:</strong> ${teamData.find(t => t.team === team).total}
                    `)
                    .style("left", (mouseX + 10) + "px")
                    .style("top", (mouseY - 15) + "px");
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .attr("stroke", "#2a2a2a")
                        .attr("stroke-width", "0.5px")
                        .attr("opacity", 0.8);
                    
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                })
                .on("click", function(event, d) {
                    // Emit a custom event for cross-filtering by team
                    window.dispatchEvent(new CustomEvent('teamSelected', { detail: { team: d.key } }));
                });
            
            // Add X axis
            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(xScale))
                .selectAll("text")
                .style("fill", "#cccccc")
                .style("font-size", "12px");
            
            // Add X axis label
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height + 40)
                .attr("text-anchor", "middle")
                .style("fill", "#ffffff")
                .text("Year");
            
            // Add Y axis
            svg.append("g")
                .call(d3.axisLeft(yScale))
                .selectAll("text")
                .style("fill", "#cccccc")
                .style("font-size", "12px");
            
            // Add Y axis label
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -40)
                .attr("text-anchor", "middle")
                .style("fill", "#ffffff")
                .text("DNF Difference");
            
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
                .data(teams)
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
                .text(d => formatTeamName(d));
            
            // Add filters
            function updateChart() {
                const selectedTeam = d3.select("#team-filter").property("value");
                const selectedSeason = d3.select("#season-filter").property("value");
                
                console.log("Filtering by team:", selectedTeam, "and season:", selectedSeason);
                
                // Prepare filter object for POST request
                const filters = {
                    season: selectedSeason,
                    team: selectedTeam,
                    selectedYears: ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"],
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
                        
                        // Restructure data for stream chart
                        const years = statistics.years;
                        const teams = filteredData.map(d => d.team);
                        
                        // Create stream data structure
                        const streamData = [];
                        years.forEach(year => {
                            const yearData = { year };
                            filteredData.forEach(team => {
                                yearData[team.team] = team[year] || 0;
                            });
                            streamData.push(yearData);
                        });
                        
                        // Update scales
                        xScale.domain(years);
                        yScale.domain([0, d3.max(streamData, d => {
                            return d3.sum(teams, team => d[team] || 0);
                        }) * 1.1]);
                        
                        // Update color scale
                        colorScale.domain(teams);
                        
                        // Update stack generator
                        const stack = d3.stack()
                            .keys(teams)
                            .order(d3.stackOrderNone)
                            .offset(d3.stackOffsetWiggle);
                        
                        const stackedData = stack(streamData);
                        
                        // Update area generator
                        const area = d3.area()
                            .x(d => xScale(d.data.year))
                            .y0(d => yScale(d[0]))
                            .y1(d => yScale(d[1]))
                            .curve(d3.curveBasis);
                        
                        // Add stream areas
                        svg.selectAll(".stream-layer")
                            .data(stackedData)
                            .enter()
                            .append("path")
                            .attr("class", "stream-layer")
                            .attr("d", area)
                            .attr("fill", d => colorScale(d.key))
                            .attr("stroke", "#2a2a2a")
                            .attr("stroke-width", 0.5)
                            .attr("opacity", 0.8)
                            .on("mouseover", function(event, d) {
                                const team = d.key;
                                
                                d3.select(this)
                                    .attr("stroke", "#ffffff")
                                    .attr("stroke-width", "2px")
                                    .attr("opacity", 1);
                                
                                tooltip.transition()
                                    .duration(200)
                                    .style("opacity", 0.9);
                                
                                const [mouseX, mouseY] = d3.pointer(event, vizContainer);
                                
                                // Find the closest year to the mouse position
                                const xPos = d3.pointer(event)[0];
                                const yearIndex = Math.round((xPos / width) * (years.length - 1));
                                const year = years[yearIndex];
                                const dnfs = d[yearIndex].data[team] || 0;
                                
                                tooltip.html(`
                                    <strong>Team:</strong> ${formatTeamName(team)}<br>
                                    <strong>Year:</strong> ${year}<br>
                                    <strong>DNFs:</strong> ${dnfs}<br>
                                    <strong>Total DNFs:</strong> ${filteredData.find(t => t.team === team).total}
                                `)
                                .style("left", (mouseX + 10) + "px")
                                .style("top", (mouseY - 15) + "px");
                            })
                            .on("mouseout", function() {
                                d3.select(this)
                                    .attr("stroke", "#2a2a2a")
                                    .attr("stroke-width", "0.5px")
                                    .attr("opacity", 0.8);
                                
                                tooltip.transition()
                                    .duration(500)
                                    .style("opacity", 0);
                            })
                            .on("click", function(event, d) {
                                // Emit a custom event for cross-filtering by team
                                window.dispatchEvent(new CustomEvent('teamSelected', { detail: { team: d.key } }));
                            });
                        
                        // Add X axis
                        svg.append("g")
                            .attr("transform", `translate(0, ${height})`)
                            .call(d3.axisBottom(xScale))
                            .selectAll("text")
                            .style("fill", "#cccccc")
                            .style("font-size", "12px");
                        
                        // Add X axis label
                        svg.append("text")
                            .attr("x", width / 2)
                            .attr("y", height + 40)
                            .attr("text-anchor", "middle")
                            .style("fill", "#ffffff")
                            .text("Year");
                        
                        // Add Y axis
                        svg.append("g")
                            .call(d3.axisLeft(yScale))
                            .selectAll("text")
                            .style("fill", "#cccccc")
                            .style("font-size", "12px");
                        
                        // Add Y axis label
                        svg.append("text")
                            .attr("transform", "rotate(-90)")
                            .attr("x", -height / 2)
                            .attr("y", -40)
                            .attr("text-anchor", "middle")
                            .style("fill", "#ffffff")
                            .text("DNF Difference");
                        
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
                            .data(teams)
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
                            .text(d => formatTeamName(d));
                        
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