// // Tyre vs Engine Failure Visualization (Grouped Bar Chart)

// document.addEventListener('DOMContentLoaded', function() {
//     // Check if D3 is loaded
//     if (typeof d3 === 'undefined') {
//         console.error('D3 library is not loaded! Loading from CDN...');
        
//         // Try to load D3 from CDN if not available
//         const script = document.createElement('script');
//         script.src = 'https://d3js.org/d3.v7.min.js';
//         script.onload = function() {
//             console.log('D3 library loaded from CDN');
//             createTyreVsEngineChart();
//         };
//         script.onerror = function() {
//             console.error('Failed to load D3 from CDN');
//             displayError('tyre-vs-engine-failure');
//         };
//         document.head.appendChild(script);
//     } else {
//         console.log('D3 library is already loaded');
//         createTyreVsEngineChart();
//     }
// });

// function displayError(containerId) {
//     const vizContainer = document.querySelector(`#${containerId} .viz-content`);
//     if (vizContainer) {
//         vizContainer.innerHTML = '<div class="error-message" style="color: #e10600; text-align: center; padding: 20px;">Failed to load visualization</div>';
//     }
// }

// function createTyreVsEngineChart() {
//     try {
//         // Check for D3 again just to be safe
//         if (typeof d3 === 'undefined') {
//             console.error('D3 is still not available');
//             displayError('tyre-vs-engine-failure');
//             return;
//         }
        
//         const card = document.getElementById('tyre-vs-engine-failure');
//         const vizContainer = card.querySelector('.viz-content');
//         if (!vizContainer) {
//             console.error('Visualization container not found');
//             return;
//         }
        
//         // Check if we're in expanded view and adjust dimensions accordingly
//         const isExpanded = card.classList.contains('expanded-view');
        
//         // Set dimensions and margins
//         const margin = {top: 60, right: isExpanded ? 140 : 80, bottom: 70, left: isExpanded ? 60 : 50};
//         const width = vizContainer.clientWidth - margin.left - margin.right;
//         const height = vizContainer.clientHeight - margin.top - margin.bottom;
        
//         // Clear any existing SVG
//         d3.select(vizContainer).selectAll("*").remove();
        
//         // Create SVG with responsive sizing
//         const svg = d3.select(vizContainer)
//             .append("svg")
//             .attr("width", "100%")
//             .attr("height", "100%")
//             .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
//             .append("g")
//             .attr("transform", `translate(${margin.left}, ${margin.top})`);
        
//         // Add title
//         svg.append("text")
//             .attr("x", width / 2)
//             .attr("y", -margin.top / 2)
//             .attr("text-anchor", "middle")
//             .style("font-size", isExpanded ? "20px" : "16px")
//             .style("font-weight", "bold")
//             .style("fill", "#ffffff")
//             .text("Tyre vs Engine Failure Comparison");
        
//         // Create toggle buttons
//         const toggleContainer = document.createElement("div");
//         toggleContainer.className = "toggle-buttons";
//         toggleContainer.style.cssText = "position: absolute; top: 10px; right: 20px; display: flex; gap: 10px;";
        
//         const tyreButton = document.createElement("button");
//         tyreButton.textContent = "Tyre Failures";
//         tyreButton.className = "toggle-button active";
//         tyreButton.style.cssText = "background: #e10600; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;";
        
//         const engineButton = document.createElement("button");
//         engineButton.textContent = "Engine Failures";
//         engineButton.className = "toggle-button";
//         engineButton.style.cssText = "background: #333; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;";
        
//         toggleContainer.appendChild(tyreButton);
//         toggleContainer.appendChild(engineButton);
//         vizContainer.appendChild(toggleContainer);
        
//         // Load and process data
//         d3.csv("/static/data/sampled.csv").then(function(data) {
//             // Find tyre-related failures
//             const tyreFailureKeywords = ['tyre', 'tire', 'puncture', 'wheel', 'suspension'];
//             const tyreFailures = data.filter(d => {
//                 const reason = d.reasonRetired ? d.reasonRetired.toLowerCase() : '';
//                 return tyreFailureKeywords.some(keyword => reason.includes(keyword));
//             });
            
//             // Find engine-related failures
//             const engineFailureKeywords = ['engine', 'power', 'turbo', 'electrical', 'hydraulics', 'fuel', 'oil', 'water'];
//             const engineFailures = data.filter(d => {
//                 const reason = d.reasonRetired ? d.reasonRetired.toLowerCase() : '';
//                 return engineFailureKeywords.some(keyword => reason.includes(keyword));
//             });
            
//             // Count failures by tyre manufacturer
//             const tyreManufacturerCounts = d3.rollup(
//                 tyreFailures,
//                 v => v.length,
//                 d => d.tyreManufacturerId || 'Unknown'
//             );
            
//             // Count failures by engine manufacturer
//             const engineManufacturerCounts = d3.rollup(
//                 engineFailures,
//                 v => v.length,
//                 d => d.engineManufacturerId || 'Unknown'
//             );
            
//             // Convert to arrays and sort
//             const tyreData = Array.from(tyreManufacturerCounts, ([manufacturer, count]) => ({
//                 manufacturer: manufacturer,
//                 count: count
//             })).sort((a, b) => b.count - a.count);
            
//             const engineData = Array.from(engineManufacturerCounts, ([manufacturer, count]) => ({
//                 manufacturer: manufacturer,
//                 count: count
//             })).sort((a, b) => b.count - a.count);
            
//             // Limit to top 8 for each category
//             const limitedTyreData = tyreData.slice(0, 8);
//             const limitedEngineData = engineData.slice(0, 8);
            
//             // Create scales and axes for tyre manufacturers
//             const xTyreScale = d3.scaleBand()
//                 .domain(limitedTyreData.map(d => d.manufacturer))
//                 .range([0, width])
//                 .padding(0.3);
            
//             const yTyreScale = d3.scaleLinear()
//                 .domain([0, d3.max(limitedTyreData, d => d.count) * 1.1])
//                 .range([height, 0]);
            
//             // Create scales and axes for engine manufacturers
//             const xEngineScale = d3.scaleBand()
//                 .domain(limitedEngineData.map(d => d.manufacturer))
//                 .range([0, width])
//                 .padding(0.3);
            
//             const yEngineScale = d3.scaleLinear()
//                 .domain([0, d3.max(limitedEngineData, d => d.count) * 1.1])
//                 .range([height, 0]);
            
//             // Create tooltip
//             const tooltip = d3.select(vizContainer)
//                 .append("div")
//                 .attr("class", "tooltip")
//                 .style("opacity", 0)
//                 .style("position", "absolute")
//                 .style("background", "#15151e")
//                 .style("border", "1px solid #e10600")
//                 .style("border-radius", "4px")
//                 .style("padding", "10px")
//                 .style("color", "#ffffff")
//                 .style("pointer-events", "none")
//                 .style("width", "auto");
            
//             // Function to show tyre manufacturer chart
//             function showTyreChart() {
//                 // Update toggle button states
//                 tyreButton.style.background = "#e10600";
//                 engineButton.style.background = "#333";
                
//                 // Clear previous chart
//                 svg.selectAll(".bar, .x-axis, .y-axis, .axis-label").remove();
                
//                 // Add X axis
//                 svg.append("g")
//                     .attr("class", "x-axis")
//                     .attr("transform", `translate(0, ${height})`)
//                     .call(d3.axisBottom(xTyreScale))
//                     .selectAll("text")
//                     .style("fill", "#cccccc")
//                     .style("font-size", "12px")
//                     .attr("transform", "rotate(-45)")
//                     .style("text-anchor", "end")
//                     .attr("dx", "-.8em")
//                     .attr("dy", ".15em");
                
//                 // Add Y axis
//                 svg.append("g")
//                     .attr("class", "y-axis")
//                     .call(d3.axisLeft(yTyreScale))
//                     .selectAll("text")
//                     .style("fill", "#cccccc")
//                     .style("font-size", "12px");
                
//                 // Add X axis label
//                 svg.append("text")
//                     .attr("class", "axis-label")
//                     .attr("text-anchor", "middle")
//                     .attr("x", width / 2)
//                     .attr("y", height + margin.bottom - 10)
//                     .style("fill", "#cccccc")
//                     .text("Tyre Manufacturers");
                
//                 // Add Y axis label
//                 svg.append("text")
//                     .attr("class", "axis-label")
//                     .attr("text-anchor", "middle")
//                     .attr("transform", `translate(${-margin.left + 15}, ${height/2}) rotate(-90)`)
//                     .style("fill", "#cccccc")
//                     .text("Number of Failures");
                
//                 // Add bars
//                 const bars = svg.selectAll(".bar")
//                     .data(limitedTyreData)
//                     .enter()
//                     .append("rect")
//                     .attr("class", "bar")
//                     .attr("x", d => xTyreScale(d.manufacturer))
//                     .attr("y", d => yTyreScale(d.count))
//                     .attr("width", xTyreScale.bandwidth())
//                     .attr("height", d => height - yTyreScale(d.count))
//                     .attr("fill", "#e10600")
//                     .attr("stroke", "#2a2a2a")
//                     .attr("stroke-width", 1)
//                     .on("mouseover", function(event, d) {
//                         // Position tooltip
//                         const [mouseX, mouseY] = d3.pointer(event, vizContainer);
                        
//                         tooltip.transition()
//                             .duration(200)
//                             .style("opacity", 0.9);
                        
//                         tooltip.html(`
//                             <strong>Manufacturer:</strong> ${d.manufacturer}<br>
//                             <strong>Failures:</strong> ${d.count}<br>
//                             <strong>Percentage:</strong> ${(d.count / tyreFailures.length * 100).toFixed(1)}%
//                         `)
//                         .style("left", (mouseX + 10) + "px")
//                         .style("top", (mouseY - 15) + "px");
                        
//                         // Highlight bar
//                         d3.select(this)
//                             .attr("fill", "#ff8d85")
//                             .attr("stroke", "#ffffff")
//                             .attr("stroke-width", 2);
//                     })
//                     .on("mouseout", function() {
//                         // Hide tooltip
//                         tooltip.transition()
//                             .duration(500)
//                             .style("opacity", 0);
                        
//                         // Remove highlight
//                         d3.select(this)
//                             .attr("fill", "#e10600")
//                             .attr("stroke", "#2a2a2a")
//                             .attr("stroke-width", 1);
//                     });
//             }
            
//             // Function to show engine manufacturer chart
//             function showEngineChart() {
//                 // Update toggle button states
//                 tyreButton.style.background = "#333";
//                 engineButton.style.background = "#e10600";
                
//                 // Clear previous chart
//                 svg.selectAll(".bar, .x-axis, .y-axis, .axis-label").remove();
                
//                 // Add X axis
//                 svg.append("g")
//                     .attr("class", "x-axis")
//                     .attr("transform", `translate(0, ${height})`)
//                     .call(d3.axisBottom(xEngineScale))
//                     .selectAll("text")
//                     .style("fill", "#cccccc")
//                     .style("font-size", "12px")
//                     .attr("transform", "rotate(-45)")
//                     .style("text-anchor", "end")
//                     .attr("dx", "-.8em")
//                     .attr("dy", ".15em");
                
//                 // Add Y axis
//                 svg.append("g")
//                     .attr("class", "y-axis")
//                     .call(d3.axisLeft(yEngineScale))
//                     .selectAll("text")
//                     .style("fill", "#cccccc")
//                     .style("font-size", "12px");
                
//                 // Add X axis label
//                 svg.append("text")
//                     .attr("class", "axis-label")
//                     .attr("text-anchor", "middle")
//                     .attr("x", width / 2)
//                     .attr("y", height + margin.bottom - 10)
//                     .style("fill", "#cccccc")
//                     .text("Engine Manufacturers");
                
//                 // Add Y axis label
//                 svg.append("text")
//                     .attr("class", "axis-label")
//                     .attr("text-anchor", "middle")
//                     .attr("transform", `translate(${-margin.left + 15}, ${height/2}) rotate(-90)`)
//                     .style("fill", "#cccccc")
//                     .text("Number of Failures");
                
//                 // Add bars
//                 const bars = svg.selectAll(".bar")
//                     .data(limitedEngineData)
//                     .enter()
//                     .append("rect")
//                     .attr("class", "bar")
//                     .attr("x", d => xEngineScale(d.manufacturer))
//                     .attr("y", d => yEngineScale(d.count))
//                     .attr("width", xEngineScale.bandwidth())
//                     .attr("height", d => height - yEngineScale(d.count))
//                     .attr("fill", "#4e40b2") // Different color for engine failures
//                     .attr("stroke", "#2a2a2a")
//                     .attr("stroke-width", 1)
//                     .on("mouseover", function(event, d) {
//                         // Position tooltip
//                         const [mouseX, mouseY] = d3.pointer(event, vizContainer);
                        
//                         tooltip.transition()
//                             .duration(200)
//                             .style("opacity", 0.9);
                        
//                         tooltip.html(`
//                             <strong>Manufacturer:</strong> ${d.manufacturer}<br>
//                             <strong>Failures:</strong> ${d.count}<br>
//                             <strong>Percentage:</strong> ${(d.count / engineFailures.length * 100).toFixed(1)}%
//                         `)
//                         .style("left", (mouseX + 10) + "px")
//                         .style("top", (mouseY - 15) + "px");
                        
//                         // Highlight bar
//                         d3.select(this)
//                             .attr("fill", "#9990ff")
//                             .attr("stroke", "#ffffff")
//                             .attr("stroke-width", 2);
//                     })
//                     .on("mouseout", function() {
//                         // Hide tooltip
//                         tooltip.transition()
//                             .duration(500)
//                             .style("opacity", 0);
                        
//                         // Remove highlight
//                         d3.select(this)
//                             .attr("fill", "#4e40b2")
//                             .attr("stroke", "#2a2a2a")
//                             .attr("stroke-width", 1);
//                     });
//             }
            
//             // Set up event listeners for toggle buttons
//             tyreButton.addEventListener("click", showTyreChart);
//             engineButton.addEventListener("click", showEngineChart);
            
//             // Initialize with tyre chart
//             showTyreChart();
            
//             // Add filter handling
//             d3.select("#season-filter").on("change", updateChart);
//             d3.select(".dashboard-button").on("click", updateChart);
            
//             function updateChart() {
//                 const selectedSeason = d3.select("#season-filter").property("value");
                
//                 // This is a placeholder for actual filtering logic
//                 if (selectedSeason !== "all") {
//                     svg.append("text")
//                         .attr("class", "filter-message")
//                         .attr("x", width / 2)
//                         .attr("y", height / 2)
//                         .attr("text-anchor", "middle")
//                         .style("fill", "#e10600")
//                         .style("font-size", "14px")
//                         .text(`Filtered by Season: ${selectedSeason}`);
//                 } else {
//                     svg.selectAll(".filter-message").remove();
//                 }
//             }
            
//         }).catch(function(error) {
//             console.error("Error loading or processing the data:", error);
//             svg.append("text")
//                 .attr("x", width / 2)
//                 .attr("y", height / 2)
//                 .attr("text-anchor", "middle")
//                 .style("fill", "#e10600")
//                 .text("Error loading data");
//         });
        
//     } catch (error) {
//         console.error("Error creating chart:", error);
//         displayError('tyre-vs-engine-failure');
//     }
// }

// // Handle window resize to make the chart responsive
// window.addEventListener("resize", function() {
//     if (typeof d3 !== 'undefined') {
//         createTyreVsEngineChart();
//     }
// }); 