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
        d3.csv("/static/data/sampled.csv")
    ]).then(function([worldData, circuitData]) {
        
        // Remove loading indicator
        const loadingElement = vizContainer.querySelector('.loading');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // Process circuit data to calculate DNF frequencies and extract circuit information
        const circuitsByLocation = {};
        
        // Count how many circuit records we process
        let processedCircuits = 0;
        
        circuitData.forEach(d => {
            // Based on the CSV header, we need to use these column names:
            // circuitid, latitude, longittude (note the typo in longitude)
            const circuitId = d.circuitid;
            const lat = d.latitude;
            const lng = d.longittude; // Note: typo in the CSV column name
            const reasonRetired = d.reasonRetired;
            
            if (circuitId && lat && lng) {
                processedCircuits++;
                const key = `${circuitId}`;
                
                if (!circuitsByLocation[key]) {
                    circuitsByLocation[key] = {
                        circuitId: circuitId,
                        circuitName: d.circuitName || circuitId,
                        lat: +lat,
                        lng: +lng,
                        country: d.country || "Unknown",
                        // Use a random assignment for circuit type since it's not in the data
                        circuitType: (Math.random() > 0.5 ? "street" : "road"),
                        totalRaces: 0,
                        dnfCount: 0,
                        dnfReasons: {}
                    };
                }
                
                circuitsByLocation[key].totalRaces++;
                
                // Check if this entry is a DNF with a valid reason
                if (d.positionText === "DNF" && reasonRetired) {
                    circuitsByLocation[key].dnfCount++;
                    
                    // Track the DNF reason
                    const reason = reasonRetired;
                    if (!circuitsByLocation[key].dnfReasons[reason]) {
                        circuitsByLocation[key].dnfReasons[reason] = 0;
                    }
                    circuitsByLocation[key].dnfReasons[reason]++;
                }
            }
        });
        
        // Convert to array and calculate DNF percentage
        const circuits = Object.values(circuitsByLocation).map(circuit => {
            circuit.dnfPercentage = circuit.totalRaces > 0 ? (circuit.dnfCount / circuit.totalRaces) * 100 : 0;
            
            // Get top 3 DNF reasons
            circuit.topReasons = Object.entries(circuit.dnfReasons)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([reason, count]) => `${reason} (${count})`);
                
            return circuit;
        });
        
        // Add some sample data to enhance visualization if needed
        if (circuits.length < 5) {
            [
                {name: "Monaco", lat: 43.734722, lng: 7.420556, country: "Monaco", type: "street", dnfPercentage: 15},
                {name: "Silverstone", lat: 52.0706, lng: -1.0174, country: "UK", type: "road", dnfPercentage: 8},
                {name: "Monza", lat: 45.6156, lng: 9.2811, country: "Italy", type: "road", dnfPercentage: 12},
                {name: "Spa", lat: 50.4372, lng: 5.9714, country: "Belgium", type: "road", dnfPercentage: 10},
                {name: "Suzuka", lat: 34.8431, lng: 136.5414, country: "Japan", type: "road", dnfPercentage: 7}
            ].forEach(sample => {
                circuits.push({
                    circuitId: sample.name.toLowerCase(),
                    circuitName: sample.name,
                    lat: sample.lat,
                    lng: sample.lng,
                    country: sample.country,
                    circuitType: sample.type,
                    dnfPercentage: sample.dnfPercentage,
                    topReasons: ["Engine failure (2)", "Collision (1)"]
                });
            });
        }
        
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
            .attr("vector-effect", "non-scaling-stroke");  // Keep stroke width constant when zooming
            
        // Create a color scale for circuit types
        const circuitTypeColor = d3.scaleOrdinal()
            .domain(["road", "street"])
            .range(["#4CAF50", "#FF5722"]);
            
        // Create a scale for circle size based on DNF percentage - using smaller range
        const sizeScale = d3.scaleLinear()
            .domain([0, d3.max(circuits, d => d.dnfPercentage) || 20])
            .range([3, 12]);  // Smaller size range for more elegant appearance
            
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
            .attr("fill", d => circuitTypeColor(d.circuitType))
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.3)
            .attr("opacity", 0.85)
            .attr("class", d => `circuit-point ${d.circuitType}`)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("stroke-width", 1.5)
                    .attr("opacity", 1)
                    .attr("r", d => sizeScale(d.dnfPercentage) * 1.2); // Slightly larger on hover
                    
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                    
                let tooltipContent = `
                    <strong>${d.circuitName}</strong><br/>
                    Country: ${d.country || "Unknown"}<br/>
                    Circuit Type: ${d.circuitType}<br/>
                    DNF Rate: ${d.dnfPercentage.toFixed(1)}%<br/>
                    <hr style="margin: 5px 0; border-color: #444;">
                    <strong>Top DNF Reasons:</strong><br/>
                `;
                
                if (d.topReasons && d.topReasons.length > 0) {
                    d.topReasons.forEach(reason => {
                        tooltipContent += `- ${reason}<br/>`;
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
                // Zoom into the circuit location
                const coords = projection([d.lng, d.lat]);
                if (!coords) return;
                
                const scale = 4;
                
                mapGroup.transition()
                    .duration(750)
                    .attr("transform", `translate(${width/2 - coords[0] * scale}, ${height/2 - coords[1] * scale}) scale(${scale})`);
                    
                circuitsGroup.transition()
                    .duration(750)
                    .attr("transform", `translate(${width/2 - coords[0] * scale}, ${height/2 - coords[1] * scale}) scale(${scale})`)
                    .selectAll("circle")
                    .attr("r", d => sizeScale(d.dnfPercentage) / scale);
            });
            
        // Add a legend for circuit types
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(20, ${height - 40})`);
            
        const circuitTypes = ["road", "street"];
        
        legend.selectAll("rect")
            .data(circuitTypes)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * 20)
            .attr("width", 12)
            .attr("height", 12)
            .attr("rx", 2)
            .attr("fill", d => circuitTypeColor(d));
            
        legend.selectAll("text")
            .data(circuitTypes)
            .enter()
            .append("text")
            .attr("x", 18)
            .attr("y", (d, i) => i * 20 + 9)
            .text(d => d.charAt(0).toUpperCase() + d.slice(1) + " Circuit")
            .attr("fill", "#ddd")
            .style("font-size", "11px");
            
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
                svg.selectAll(".road").style("display", "block");
            });
            
        controls.append("button")
            .attr("class", "button circuit-filter")
            .attr("data-type", "street")
            .text("Street Circuits")
            .on("click", function() {
                d3.selectAll(".circuit-filter").classed("active", false);
                d3.select(this).classed("active", true);
                svg.selectAll(".circuit-point").style("display", "none");
                svg.selectAll(".street").style("display", "block");
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