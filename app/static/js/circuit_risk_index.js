document.addEventListener('DOMContentLoaded', function() {
    initCircuitRiskIndex();
    
    // Add event listener for the expand button to handle resize
    document.querySelector('#circuit-risk-index .expand-button').addEventListener('click', function() {
        // Allow time for expansion animation
        setTimeout(() => {
            const container = document.querySelector('#circuit-risk-index .viz-content');
            if (container.closest('.expanded-view')) {
                initCircuitRiskIndex(); // Reinitialize to fit the new container size
            }
        }, 300);
    });
    
    // Handle window resize
    window.addEventListener('resize', debounce(function() {
        initCircuitRiskIndex();
    }, 250));
});

// Debounce function to prevent excessive redraws on resize
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function initCircuitRiskIndex() {
    const vizContainer = document.querySelector('#circuit-risk-index .viz-content');
    const isExpanded = vizContainer.closest('.expanded-view') !== null;
    
    // Set the dimensions and margins of the graph
    const margin = {top: 10, right: 10, bottom: 50, left: 30},
          width = vizContainer.clientWidth - margin.left - margin.right,
          height = (isExpanded ? vizContainer.clientHeight : 500) - margin.top - margin.bottom;
    
    // Clear any existing content
    vizContainer.innerHTML = '';
    
    // Create the SVG container
    const svg = d3.select(vizContainer)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create a tooltip div
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "#222")
        .style("color", "#fff")
        .style("border", "1px solid #444")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.3)")
        .style("pointer-events", "none")
        .style("z-index", "1000");
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Loading circuit data...';
    vizContainer.appendChild(loadingDiv);
    
    // Load the world map data and circuit data
    Promise.all([
        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
        fetch('/api/circuit-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }).then(response => response.json())
    ]).then(function([worldData, circuitResponse]) {
        
        // Remove loading indicator
        const loadingElement = vizContainer.querySelector('.loading');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        if (circuitResponse.status !== 'success') {
            throw new Error(circuitResponse.message || 'Failed to load circuit data');
        }
        
        const circuits = circuitResponse.data;
        
        // Calculate map dimensions to fit the container while maintaining aspect ratio
        const mapWidth = width;
        const mapHeight = height;
        
        // Create a projection for the map
        const projection = d3.geoMercator()
            .scale((mapWidth / 6))
            .center([0, 20])
            .translate([mapWidth / 2, mapHeight / 2]);
            
        // Create a path generator
        const path = d3.geoPath()
            .projection(projection);
            
        // Draw the world map with a dark theme
        const mapGroup = svg.append("g")
            .attr("class", "map-layer");
            
        mapGroup.selectAll("path")
            .data(worldData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", "#2A2A2A")
            .attr("stroke", "#555")
            .attr("stroke-width", 0.5)
            .attr("vector-effect", "non-scaling-stroke");
            
        // Create a color scale for circuit types with intensity based on DNF counts
        const circuitTypeColor = d3.scaleOrdinal()
            .domain(["street", "race", "road"])
            .range(["#4CAF50", "#FF5722", "#00BCD4"]);

        // Create a scale for color intensity based on DNF percentage
        const colorIntensityScale = d3.scaleLinear()
            .domain([0, d3.max(circuits, d => d.dnfPercentage) || 20])
            .range([0.3, 1]);
            
        // Create a scale for circle size based on DNF percentage
        const sizeScale = d3.scaleLinear()
            .domain([0, d3.max(circuits, d => d.dnfPercentage) || 20])
            .range([3, 12]);
            
        // Add circuit locations as circles
        const circuitsGroup = svg.append("g")
            .attr("class", "circuits-layer");
            
        circuitsGroup.selectAll("circle")
            .data(circuits)
            .enter()
            .append("circle")
            .attr("cx", d => {
                const point = projection([d.lng, d.lat]);
                return point ? point[0] : 0;
            })
            .attr("cy", d => {
                const point = projection([d.lng, d.lat]);
                return point ? point[1] : 0;
            })
            .attr("r", d => sizeScale(d.dnfPercentage))
            .attr("fill", d => {
                const baseColor = circuitTypeColor(d.circuitType);
                const intensity = colorIntensityScale(d.dnfPercentage);
                return d3.color(baseColor).copy({opacity: intensity});
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.3)
            .attr("opacity", 0.85)
            .attr("class", d => {
                const className = `circuit-point ${d.circuitType}`;
                console.log(`Assigning class: ${className} to circuit: ${d.circuitName}`);
                return className;
            })
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("stroke-width", 1.5)
                    .attr("opacity", 1)
                    .attr("r", d => sizeScale(d.dnfPercentage) * 1.2);
                    
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                    
                let tooltipContent = `
                    <strong>${d.circuitName}</strong><br/>
                    Country: ${d.country}<br/>
                    Circuit Type: ${d.circuitType}<br/>
                    DNF Rate: ${d.dnfPercentage.toFixed(1)}%<br/>
                    <hr style="margin: 5px 0; border-color: #444;">
                    <strong>Top DNF Reasons:</strong><br/>
                `;
                
                if (d.topReasons && d.topReasons.length > 0) {
                    d.topReasons.forEach(([reason, count]) => {
                        tooltipContent += `- ${reason} (${count})<br/>`;
                    });
                } else {
                    tooltipContent += "No DNF data available";
                }
                
                tooltip.html(tooltipContent)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke-width", 0.3)
                    .attr("opacity", 0.85)
                    .attr("r", d => sizeScale(d.dnfPercentage));
                    
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .on("click", function(event, d) {
                // Dispatch a custom event for cross-filtering by circuitId
                window.dispatchEvent(new CustomEvent('circuitSelected', { detail: { circuitId: d.circuitId, circuitName: d.circuitName } }));
            });
            
        // Add a legend for circuit types with intensity gradient
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(20, ${height - 80})`);
            
        const circuitTypes = ["road", "race", "street"];
        
        // Add base color rectangles
        legend.selectAll("rect.base")
            .data(circuitTypes)
            .enter()
            .append("rect")
            .attr("class", "base")
            .attr("x", 0)
            .attr("y", (d, i) => i * 25)
            .attr("width", 12)
            .attr("height", 12)
            .attr("rx", 2)
            .attr("fill", d => circuitTypeColor(d));
            
        // Add intensity gradient rectangles
        legend.selectAll("rect.intensity")
            .data(circuitTypes)
            .enter()
            .append("rect")
            .attr("class", "intensity")
            .attr("x", 15)
            .attr("y", (d, i) => i * 25)
            .attr("width", 12)
            .attr("height", 12)
            .attr("rx", 2)
            .attr("fill", d => {
                const baseColor = circuitTypeColor(d);
                return d3.color(baseColor).copy({opacity: 0.8});
            });
            
        // Add labels
        legend.selectAll("text")
            .data(circuitTypes)
            .enter()
            .append("text")
            .attr("x", 35)
            .attr("y", (d, i) => i * 25 + 9)
            .text(d => d.charAt(0).toUpperCase() + d.slice(1) + " Circuit")
            .attr("fill", "#ddd")
            .style("font-size", "11px");

        // Add intensity explanation
        legend.append("text")
            .attr("x", 0)
            .attr("y", circuitTypes.length * 25 + 20)
            .text("Color intensity indicates DNF rate")
            .attr("fill", "#ddd")
            .style("font-size", "10px");
            
        // Add controls for filtering by circuit type
        const controls = d3.select(vizContainer)
            .append("div")
            .attr("class", "circuit-controls")
            .style("margin-top", "10px");
            
        controls.append("button")
            .attr("class", "button circuit-filter active")
            .attr("data-type", "all")
            .text("All Circuits")
            .on("click", function() {
                d3.selectAll(".circuit-filter").classed("active", false);
                d3.select(this).classed("active", true);
                svg.selectAll(".circuit-point").style("display", "block");
            });
            
        controls.append("button")
            .attr("class", "button circuit-filter")
            .attr("data-type", "road")
            .text("Road Circuits")
            .on("click", function() {
                d3.selectAll(".circuit-filter").classed("active", false);
                d3.select(this).classed("active", true);
                svg.selectAll(".circuit-point").style("display", "none");
                svg.selectAll(".ROAD").style("display", "block");
            });
            
        controls.append("button")
            .attr("class", "button circuit-filter")
            .attr("data-type", "street")
            .text("Street Circuits")
            .on("click", function() {
                d3.selectAll(".circuit-filter").classed("active", false);
                d3.select(this).classed("active", true);
                svg.selectAll(".circuit-point").style("display", "none");
                svg.selectAll(".STREET").style("display", "block");
            });
        
        controls.append("button")
            .attr("class", "button circuit-filter")
            .attr("data-type", "road")
            .text("Race Circuits")
            .on("click", function() {
                d3.selectAll(".circuit-filter").classed("active", false);
                d3.select(this).classed("active", true);
                svg.selectAll(".circuit-point").style("display", "none");
                svg.selectAll(".RACE").style("display", "block");
            });
            
        // Add a reset zoom button
        controls.append("button")
            .attr("class", "button reset-zoom")
            .text("Reset View")
            .style("margin-left", "10px")
            .on("click", function() {
                mapGroup.transition()
                    .duration(750)
                    .attr("transform", "translate(0,0) scale(1)");
                
                circuitsGroup.transition()
                    .duration(750)
                    .attr("transform", "translate(0,0) scale(1)")
                    .selectAll("circle")
                    .attr("r", d => sizeScale(d.dnfPercentage));
            });
    }).catch(function(error) {
        console.error("Error loading data:", error);
        vizContainer.innerHTML = `<div class="error-message">Failed to load circuit data: ${error.message}</div>`;
    });
} 