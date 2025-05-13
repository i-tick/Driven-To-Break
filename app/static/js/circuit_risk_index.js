document.addEventListener('DOMContentLoaded', function() {
    initCircuitRiskIndex();
    
    // Add event listener for the expand button to handle resize
    document.querySelector('#circuit-risk-index .expand-button').addEventListener('click', function() {
        // Allow time for expansion animation
        setTimeout(() => {
            const container = document.querySelector('#circuit-risk-index .viz-content');
            if (container.closest('.expanded-view')) {
                initCircuitRiskIndex(); // Reinitialize to fit the new container size
                
                // Show both legends when expanded
                d3.select('#circuit-risk-index .country-legend')
                    .style("visibility", "visible");
                d3.select('#circuit-risk-index .legend')
                    .style("visibility", "visible");
            } else {
                // Hide both legends when collapsed
                d3.select('#circuit-risk-index .country-legend')
                    .style("visibility", "hidden");
                d3.select('#circuit-risk-index .legend')
                    .style("visibility", "hidden");
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
        
        // Get unique countries from circuit data
        const countries = [...new Set(circuits.map(d => d.country))];
        
        // Create a color scale with shades from dark to light red
        const countryColorScale = d3.scaleSequential()
            .domain([0, 1])
            .interpolator(d => {
                // Color range from darker red to lighter shades
                const colors = [
                    "#8B0000", // Dark red
                    "#B22222", // Firebrick
                    "#CD5C5C", // Indian Red
                    "#F08080", // Light Coral
                    "#FFCCCB", // Light Pink
                    "#FFE4E1"  // Misty Rose
                ];
                
                // Calculate index based on position in domain
                const index = Math.floor(d * (colors.length - 1));
                const remainder = d * (colors.length - 1) - index;
                
                // Interpolate between adjacent colors if needed
                if (index >= colors.length - 1) return colors[colors.length - 1];
                
                const color1 = d3.color(colors[index]);
                const color2 = d3.color(colors[index + 1]);
                
                // Blend between the two colors
                return d3.rgb(
                    color1.r + remainder * (color2.r - color1.r),
                    color1.g + remainder * (color2.g - color1.g),
                    color1.b + remainder * (color2.b - color1.b)
                );
            });
            
        // Draw the world map with a dark theme
        const mapGroup = svg.append("g")
            .attr("class", "map-layer");
            
        // Create a mapping to track which countries contain circuits
        const countriesWithCircuits = new Set();
        
        // First pass - identify countries with circuits by doing a point-in-polygon test
        circuits.forEach(circuit => {
            const point = [circuit.lng, circuit.lat];
            worldData.features.forEach(feature => {
                // Check if the circuit's coordinates are inside this country's polygon
                if (d3.geoContains(feature, point)) {
                    // Mark this country as having a circuit
                    feature.properties.hasCircuit = true;
                    feature.properties.circuitCount = (feature.properties.circuitCount || 0) + 1;
                    feature.properties.circuitCountry = circuit.country;
                    countriesWithCircuits.add(feature);
                }
            });
        });
        
        console.log("Countries with circuits identified:", countriesWithCircuits.size);
        
        // Map of country IDs to their possible names in the GeoJSON
        const countryNameMap = {
            "united-states-of-america": ["United States of America", "United States", "USA"],
            "united-kingdom": ["United Kingdom", "UK", "Great Britain"],
            "united-arab-emirates": ["United Arab Emirates"],
            "saudi-arabia": ["Saudi Arabia"],
            "australia": ["Australia"],
            "austria": ["Austria"],
            "azerbaijan": ["Azerbaijan"],
            "bahrain": ["Bahrain"],
            "belgium": ["Belgium"],
            "brazil": ["Brazil"],
            "canada": ["Canada"],
            "china": ["China"],
            "france": ["France"],
            "germany": ["Germany"],
            "hungary": ["Hungary"],
            "italy": ["Italy"],
            "japan": ["Japan"],
            "malaysia": ["Malaysia"],
            "mexico": ["Mexico"],
            "monaco": ["Monaco"],
            "netherlands": ["Netherlands"],
            "portugal": ["Portugal"],
            "qatar": ["Qatar"],
            "russia": ["Russia", "Russian Federation"],
            "singapore": ["Singapore"],
            "spain": ["Spain"],
            "turkey": ["Turkey"]
        };
        
        // Explicitly map each country
        const countryCircuits = {};
        circuits.forEach(circuit => {
            const country = circuit.country;
            if (!countryCircuits[country]) {
                countryCircuits[country] = [];
            }
            countryCircuits[country].push(circuit);
        });
        
        // Ensure all countries with circuits in our data are represented on the map
        Object.entries(countryCircuits).forEach(([countryId, circuitsList]) => {
            // Find country in world data
            const possibleNames = countryNameMap[countryId] || [countryId.replace(/-/g, ' ')];
            
            const countryFeature = worldData.features.find(f => 
                possibleNames.some(name => 
                    f.properties.name === name || 
                    f.properties.name.toLowerCase() === name.toLowerCase()
                )
            );
            
            if (countryFeature && !countryFeature.properties.hasCircuit) {
                countryFeature.properties.hasCircuit = true;
                countryFeature.properties.circuitCount = circuitsList.length;
                countryFeature.properties.circuitCountry = countryId;
                countriesWithCircuits.add(countryFeature);
                console.log(`Explicitly added ${countryId} with ${circuitsList.length} circuits`);
            }
        });
        
        // Special case for United States (in case point-in-polygon test doesn't work)
        const unitedStates = worldData.features.find(f => 
            f.properties.name === "United States of America" || 
            f.properties.name === "United States"
        );
        
        if (unitedStates && !unitedStates.properties.hasCircuit) {
            unitedStates.properties.hasCircuit = true;
            unitedStates.properties.circuitCount = 3; // Known to have multiple circuits
            unitedStates.properties.circuitCountry = "united-states-of-america";
            countriesWithCircuits.add(unitedStates);
            console.log("Explicitly added United States");
        }
        
        // Special case for Russia
        const russia = worldData.features.find(f => 
            f.properties.name === "Russia" ||
            f.properties.name === "Russian Federation"
        );
        
        if (russia && !russia.properties.hasCircuit) {
            russia.properties.hasCircuit = true;
            russia.properties.circuitCount = 1; // Typically has one circuit
            russia.properties.circuitCountry = "russia";
            countriesWithCircuits.add(russia);
            console.log("Explicitly added Russia");
        }
        
        // Now draw the map with the identified countries
        mapGroup.selectAll("path")
            .data(worldData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => {
                if (d.properties.hasCircuit) {
                    // Use the intensity based on the number of circuits
                    // REVERSED from previous implementation - more circuits = darker color
                    const intensity = 1 - Math.min(d.properties.circuitCount / 3, 1);
                    return countryColorScale(intensity);
                }
                return "#2A2A2A"; // Default dark color for countries without circuits
            })
            .attr("stroke", "#555")
            .attr("stroke-width", 0.5)
            .attr("vector-effect", "non-scaling-stroke")
            .attr("class", d => d.properties.hasCircuit ? "f1-country" : "")
            .on("mouseover", function(event, d) {
                if (d.properties.hasCircuit) {
                    d3.select(this)
                        .attr("stroke", "#fff")
                        .attr("stroke-width", 1.5);
                        
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    
                    // Find circuits in this country
                    const countryCircuits = circuits.filter(c => {
                        const point = [c.lng, c.lat];
                        return d3.geoContains(d, point);
                    });
                    
                    // If no circuits found via geo-contains, use the country ID
                    let matchingCircuits = countryCircuits.length > 0 ? 
                        countryCircuits : 
                        circuits.filter(c => c.country === d.properties.circuitCountry);
                    
                    // Special case for United States
                    if (d.properties.name === "United States of America" || d.properties.name === "United States") {
                        matchingCircuits = circuits.filter(c => c.country === "united-states-of-america");
                    }
                    
                    if (matchingCircuits.length > 0) {
                        const totalDNFs = matchingCircuits.reduce((sum, c) => sum + c.dnfCount, 0);
                        const avgDNFRate = matchingCircuits.reduce((sum, c) => sum + c.dnfPercentage, 0) / matchingCircuits.length;
                        
                        let tooltipContent = `
                            <strong>${d.properties.name}</strong><br/>
                            Circuits: ${matchingCircuits.length}<br/>
                            Total DNFs: ${totalDNFs}<br/>
                            Avg DNF Rate: ${avgDNFRate.toFixed(1)}%<br/>
                            <hr style="margin: 5px 0; border-color: #444;">
                            <strong>Circuits:</strong><br/>
                        `;
                        
                        matchingCircuits.forEach(c => {
                            tooltipContent += `- ${c.circuitName} (${c.dnfPercentage.toFixed(1)}%)<br/>`;
                        });
                        
                        tooltip.html(tooltipContent)
                            .style("left", (event.pageX + 15) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    }
                }
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke", "#555")
                    .attr("stroke-width", 0.5);
                    
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .on("click", function(event, d) {
                // Prevent event propagation
                event.stopPropagation();
                
                // Get coordinates for the clicked circuit
                const point = projection([d.lng, d.lat]);
                if (point) {
                    // Zoom to the clicked circuit
                    const scale = 4; // Zoom level
                    const [x, y] = point;
                    
                    // Apply zoom transition to map and circuits groups
                    mapGroup.transition()
                        .duration(750)
                        .attr("transform", `translate(${width/2 - scale*x}, ${height/2 - scale*y}) scale(${scale})`);
                    
                    circuitsGroup.transition()
                        .duration(750)
                        .attr("transform", `translate(${width/2 - scale*x}, ${height/2 - scale*y}) scale(${scale})`)
                        .selectAll("circle")
                        .attr("r", d => sizeScale(d.dnfPercentage) / scale);
                }
                
                // Dispatch a custom event for cross-filtering by circuitId
                window.dispatchEvent(new CustomEvent('circuitSelected', { 
                    detail: { circuitId: d.circuitId, circuitName: d.circuitName } 
                }));
                
                // Dispatch a countrySelected event for PCP plot filtering
                window.dispatchEvent(new CustomEvent('countrySelected', { 
                    detail: { country: d.country } 
                }));
            });
            
        // Create a color scale for circuit types with intensity based on DNF counts
        const circuitTypeColor = d3.scaleOrdinal()
            .domain(["street", "race", "road"])
            .range(["#4CAF50", "#FFFFFF", "#00BCD4"]);

        // Create a scale for color intensity based on DNF percentage
        const colorIntensityScale = d3.scaleLinear()
            .domain([0, d3.max(circuits, d => d.dnfPercentage) || 20])
            .range([0.3, 1]);
            
        // Create a scale for circle size based on DNF percentage
        const sizeScale = d3.scaleLinear()
            .domain([0, d3.max(circuits, d => d.dnfPercentage) || 20])
            .range([4, 14]);
            
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
                // Use more vibrant, high-contrast colors for each circuit type
                const baseColor = circuitTypeColor(d.circuitType);
                return d3.color(baseColor).brighter(0.5);
            })
            .attr("stroke", "#FFFFFF") // White border for contrast
            .attr("stroke-width", 1.5) // Thicker border
            .attr("opacity", 0.95) // Higher opacity
            .attr("class", d => {
                const className = `circuit-point ${d.circuitType}`;
                return className;
            })
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("stroke-width", 2.5)
                    .attr("opacity", 1)
                    .attr("r", d => sizeScale(d.dnfPercentage) * 1.3);
                    
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
                    .attr("stroke-width", 1.5)
                    .attr("opacity", 0.95)
                    .attr("r", d => sizeScale(d.dnfPercentage));
                    
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .on("click", function(event, d) {
                // Prevent event propagation
                event.stopPropagation();
                
                // Get coordinates for the clicked circuit
                const point = projection([d.lng, d.lat]);
                if (point) {
                    // Zoom to the clicked circuit
                    const scale = 4; // Zoom level
                    const [x, y] = point;
                    
                    // Apply zoom transition to map and circuits groups
                    mapGroup.transition()
                        .duration(750)
                        .attr("transform", `translate(${width/2 - scale*x}, ${height/2 - scale*y}) scale(${scale})`);
                    
                    circuitsGroup.transition()
                        .duration(750)
                        .attr("transform", `translate(${width/2 - scale*x}, ${height/2 - scale*y}) scale(${scale})`)
                        .selectAll("circle")
                        .attr("r", d => sizeScale(d.dnfPercentage) / scale);
                }
                
                // Dispatch a custom event for cross-filtering by circuitId
                window.dispatchEvent(new CustomEvent('circuitSelected', { 
                    detail: { circuitId: d.circuitId, circuitName: d.circuitName } 
                }));
                
                // Dispatch a countrySelected event for PCP plot filtering
                window.dispatchEvent(new CustomEvent('countrySelected', { 
                    detail: { country: d.country } 
                }));
            });
            
        // Add a legend for circuit types with intensity gradient
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(20, ${height - 180})`)
            .style("visibility", isExpanded ? "visible" : "hidden"); // Only visible when expanded
            
        const circuitTypes = ["road", "race", "street"];
        
        // Add base color rectangles
        legend.selectAll("rect.base")
            .data(circuitTypes)
            .enter()
            .append("rect")
            .attr("class", "base")
            .attr("x", 0)
            .attr("y", (d, i) => i * 25)
            .attr("width", 16)
            .attr("height", 16)
            .attr("rx", 8) // Make circular like the points
            .attr("fill", d => d3.color(circuitTypeColor(d)).brighter(0.5))
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 1.5);
            
        // Add labels with clearer description
        legend.selectAll("text")
            .data(circuitTypes)
            .enter()
            .append("text")
            .attr("x", 25)
            .attr("y", (d, i) => i * 25 + 12)
            .text(d => d.charAt(0).toUpperCase() + d.slice(1) + " Circuit")
            .attr("fill", "#FFFFFF") // Make text color white for better visibility
            .style("font-size", "12px")
            .style("font-weight", "bold");

        // Add intensity explanation
        legend.append("text")
            .attr("x", 0)
            .attr("y", circuitTypes.length * 25 + 20)
            .text("Circle size indicates DNF rate")
            .attr("fill", "#FFFFFF")
            .style("font-size", "10px");
            
        // Add country color explanation
        legend.append("text")
            .attr("x", 0)
            .attr("y", circuitTypes.length * 25 + 40)
            .text("Countries in red host F1 races")
            .attr("fill", "#FFFFFF")
            .style("font-size", "10px");
            
        // Add country color legend showing the meaning of different red shades
        const countryLegend = svg.append("g")
            .attr("class", "country-legend")
            .attr("transform", `translate(${width - 160}, ${height - 120})`)
            .style("visibility", isExpanded ? "visible" : "hidden"); // Only visible when expanded
            
        // Create sample data for color scale
        const colorSamples = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
        const colorLabels = ["High F1 Activity", "", "", "", "", "Low F1 Activity"];
        
        // Add color rectangles for the country color scale
        countryLegend.selectAll("rect.country-color")
            .data(colorSamples)
            .enter()
            .append("rect")
            .attr("class", "country-color")
            .attr("x", 0)
            .attr("y", (d, i) => i * 20)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", d => countryColorScale(d));
            
        // Add labels for the country color legend
        countryLegend.selectAll("text.country-label")
            .data(colorLabels)
            .enter()
            .append("text")
            .attr("class", "country-label")
            .attr("x", 25)
            .attr("y", (d, i) => i * 20 + 14)
            .text(d => d)
            .attr("fill", "#FFFFFF")
            .style("font-size", "11px")
            .style("font-weight", d => d ? "bold" : "normal");
            
        // Add title for country color legend
        countryLegend.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .text("F1 Activity Level")
            .attr("fill", "#FFFFFF")
            .style("font-size", "12px")
            .style("font-weight", "bold");
            
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
            
        // Add interactive filtering information
        controls.append("div")
            .attr("class", "filter-info")
            .style("margin-top", "10px")
            .style("font-size", "12px")
            .style("color", "#DDD")
            .html("<i class='fa fa-info-circle'></i> Click on a circuit to filter the PCP plot by country and the failure cause breakdown by circuit");
            
        // Add double-click handler to SVG background to reset zoom
        svg.on("dblclick", function() {
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