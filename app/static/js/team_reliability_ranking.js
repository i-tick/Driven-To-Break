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
        d3.csv("/static/data/sampled.csv").then(function(data) {
            // Define a limited set of years to include (to keep the chart readable)
            const selectedYears = ["2020", "2021", "2022", "2023", "2024"];
            
            // Get unique constructors and filter the data by the selected years
            const filteredData = data.filter(d => selectedYears.includes(d.year));
            
            // Count DNFs by constructor and year
            const dnfsByTeamAndYear = d3.rollup(
                filteredData,
                v => v.length, // Count of DNFs
                d => d.constructorId, // Group by constructor
                d => d.year // Group by year
            );
            
            // Convert to array format for easier processing
            let teamData = Array.from(dnfsByTeamAndYear, ([team, yearMap]) => {
                // Convert nested map to object with years as properties
                const yearValues = {};
                yearMap.forEach((count, year) => {
                    yearValues[year] = count;
                });
                
                // Set count to 0 for years that don't have data
                selectedYears.forEach(year => {
                    if (!yearValues[year]) yearValues[year] = 0;
                });
                
                // Calculate total DNFs for sorting
                const total = selectedYears.reduce((sum, year) => sum + (yearValues[year] || 0), 0);
                
                return {
                    team: team,
                    ...yearValues,
                    total: total
                };
            });
            
            // Sort by total DNFs (descending)
            teamData.sort((a, b) => b.total - a.total);
            
            // Limit to top 10 teams for better readability
            if (teamData.length > 10) {
                teamData = teamData.slice(0, 10);
            }
            
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
                .domain(selectedYears)
                .range(["#e10600", "#ff5a4d", "#ff8d85", "#ffbdb8", "#ffd2cd"]);
            
            // Create the stacked data
            const stackedData = d3.stack()
                .keys(selectedYears)
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
                .attr("fill", (d, i) => colorScale(selectedYears[i]))
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
                    // Get the year from the parent g element's data
                    const yearIndex = this.parentNode.__data__.index;
                    const year = selectedYears[yearIndex];
                    const count = d[1] - d[0]; // The value for this segment
                    
                    // Position tooltip
                    const [mouseX, mouseY] = d3.pointer(event, vizContainer);
                    
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    
                    // Format tooltip content
                    tooltip.html(`
                        <strong>Team:</strong> ${formatTeamName(d.data.team)}<br>
                        <strong>Year:</strong> ${year}<br>
                        <strong>DNFs:</strong> ${count}<br>
                        <strong>Total DNFs:</strong> ${d.data.total}
                    `)
                    .style("left", (mouseX + 10) + "px")
                    .style("top", (mouseY - 15) + "px");
                    
                    // Highlight current segment
                    d3.select(this)
                        .style("stroke", "#ffffff")
                        .style("stroke-width", "2px");
                })
                .on("mouseout", function() {
                    // Hide tooltip
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                    
                    // Remove highlight
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
            
            // Add X axis label
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("x", width / 2)
                .attr("y", height + margin.bottom - 10)
                .style("fill", "#cccccc")
                .text("Teams");
            
            // Add Y axis label
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("transform", `translate(${-margin.left + 15}, ${height/2}) rotate(-90)`)
                .style("fill", "#cccccc")
                .text("Number of DNFs");
            
            // Add legend
            const legend = svg.append("g")
                .attr("font-size", "12px")
                .attr("text-anchor", "start")
                .selectAll("g")
                .data(selectedYears)
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
                
                // This is a placeholder for actual filtering logic
                if (selectedTeam !== "all" || selectedSeason !== "all") {
                    svg.append("text")
                        .attr("class", "filter-message")
                        .attr("x", width / 2)
                        .attr("y", height / 2)
                        .attr("text-anchor", "middle")
                        .style("fill", "#e10600")
                        .style("font-size", "14px")
                        .text(`Filtered by: ${selectedTeam !== "all" ? `Team: ${selectedTeam}` : ""} ${selectedSeason !== "all" ? `Season: ${selectedSeason}` : ""}`);
                } else {
                    svg.selectAll(".filter-message").remove();
                }
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