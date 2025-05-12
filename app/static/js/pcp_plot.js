document.addEventListener('DOMContentLoaded', function() {
    initPCPPlot();
    
    // Add event listener for the expand button to handle resize
    document.querySelector('#pcp-plot .expand-button').addEventListener('click', function() {
        setTimeout(() => {
            const container = document.querySelector('#pcp-plot .viz-content');
            if (container.closest('.expanded-view')) {
                initPCPPlot();
            }
        }, 300);
    });
    
    // Handle window resize
    window.addEventListener('resize', debounce(function() {
        initPCPPlot();
    }, 250));
});

function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

let selectedCountryFilter = null;

window.addEventListener('countrySelected', function(e) {
    // Set the filter to the selected country from the geo map
    selectedCountryFilter = e.detail.country;
    updatePCPHighlightByCountry();
});

function updatePCPHighlightByCountry() {
    d3.selectAll('.pcp-line').style('display', d => {
        if (!selectedCountryFilter) return null;
        return d.country === selectedCountryFilter ? null : 'none';
    });
    // Show/hide reset button
    const btn = document.getElementById('reset-country-filter-btn');
    if (btn) btn.style.display = selectedCountryFilter ? 'block' : 'none';
}

function addCountryResetButton() {
    let btn = document.getElementById('reset-country-filter-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'reset-country-filter-btn';
        btn.textContent = 'Reset Country Filter';
        btn.style.margin = '10px 0 10px 10px';
        btn.style.padding = '6px 14px';
        btn.style.background = '#e10600';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.display = 'none';
        btn.onclick = function() {
            selectedCountryFilter = null;
            updatePCPHighlightByCountry();
        };
        // Insert above the PCP plot
        const vizContainer = document.querySelector('#pcp-plot .viz-content');
        if (vizContainer) {
            vizContainer.parentNode.insertBefore(btn, vizContainer);
        }
    }
}

function initPCPPlot() {
    const vizContainer = document.querySelector('#pcp-plot .viz-content');
    const isExpanded = vizContainer.closest('.expanded-view') !== null;
    
    // Set the dimensions and margins of the graph
    const margin = {top: 40, right: 60, bottom: 80, left: 60},
          width = vizContainer.clientWidth - margin.left - margin.right,
          height = (isExpanded ? vizContainer.clientHeight : 500) - margin.top - margin.bottom;
    
    // Clear any existing content
    vizContainer.innerHTML = '';
    
    // Create the SVG container with dark theme styling
    const svg = d3.select(vizContainer)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "#1a1a1a")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add loading indicator with theme styling
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Loading data...';
    loadingDiv.style.color = '#ffffff';
    vizContainer.appendChild(loadingDiv);
    
    // Fetch data from the endpoint
    fetch('/api/pcp-data')
        .then(response => response.json())
        .then(function(data) {
            // Remove loading indicator
            const loadingElement = vizContainer.querySelector('.loading');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            if (data.status !== 'success') {
                throw new Error(data.message || 'Failed to load data');
            }
            
            const pcpData = data.data;
            
            // Define the dimensions to plot and their types - reordered with categorical first
            const dimensions = [
                { name: 'circuitType', type: 'categorical', label: 'Circuit Type' },
                { name: 'reasonRetired', type: 'categorical', label: 'Reason Retired' },
                { name: 'constructor', type: 'categorical', label: 'Constructor' },
                { name: 'engine', type: 'categorical', label: 'Engine' },
                { name: 'tyre', type: 'categorical', label: 'Tyre' },
                { name: 'country', type: 'categorical', label: 'Country' },
                { name: 'year', type: 'numeric', label: 'Year' },
                { name: 'grid', type: 'numeric', label: 'Grid Position' },
                { name: 'laps', type: 'numeric', label: 'Number of Laps' }
            ];
            
            // Create scales for each dimension
            const scales = {};
            dimensions.forEach(dim => {
                if (dim.type === 'numeric') {
                    scales[dim.name] = d3.scaleLinear()
                        .domain(d3.extent(pcpData, d => d[dim.name]))
                        .range([height, 0]);
                } else {
                    const uniqueValues = [...new Set(pcpData.map(d => d[dim.name]))];
                    scales[dim.name] = d3.scalePoint()
                        .domain(uniqueValues)
                        .range([height, 0])
                        .padding(0.5);
                }
            });
            
            // Create color scale with a more vibrant palette
            const colorScale = d3.scaleSequential()
                .domain(d3.extent(pcpData, d => d.year))
                .interpolator(d3.interpolateRdYlBu);
            
            // Draw the axes with theme styling
            const g = svg.selectAll(".dimension")
                .data(dimensions)
                .enter().append("g")
                .attr("class", "dimension")
                .attr("transform", (d, i) => `translate(${i * (width / (dimensions.length - 1))}, 0)`)
                .call(d3.drag()
                    .subject(function(event, d) {
                        return {x: d3.select(this).attr("transform").match(/translate\(([^,]+)/)[1]};
                    })
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));
            
            // Add background rectangles for axis labels first
            g.append("rect")
                .attr("x", -60)
                .attr("y", -38)
                .attr("width", 120)
                .attr("height", 26)
                .attr("rx", 6)
                .attr("fill", "#222")
                .attr("opacity", 0.7);
                
            // Add axis labels with theme styling and improved visibility
            g.append("text")
                .attr("text-anchor", "middle")
                .attr("y", -22)
                .attr("x", 0)
                .style("font-weight", "bold")
                .style("fill", "#fff")
                .style("font-size", "18px")
                .style("font-family", "sans-serif")
                .style("pointer-events", "none")
                .style("text-shadow", "0 0 8px #000, 0 0 2px #000, 0 0 2px #000")
                .text(d => d.label);
            
            // Add axis labels and lines with theme styling
            g.append("g")
                .attr("class", "axis")
                .each(function(d) {
                    const axis = d.type === 'numeric' ? 
                        d3.axisLeft(scales[d.name]) :
                        d3.axisLeft(scales[d.name])
                            .tickFormat(d => d.length > 10 ? d.substring(0, 10) + '...' : d);
                    d3.select(this)
                        .call(axis)
                        .call(g => g.selectAll(".domain")
                            .attr("stroke", "#888"))
                        .call(g => g.selectAll(".tick line")
                            .attr("stroke", "#888"))
                        .call(g => g.selectAll(".tick text")
                            .attr("fill", "#fff")
                            .style("font-size", "13px")
                            .style("font-family", "sans-serif")
                            .style("text-shadow", "0 0 6px #000, 0 0 2px #000"));
                });

            // Draw the lines with enhanced styling
            const line = d3.line()
                .defined(d => !isNaN(d.y))
                .x(d => d.x)
                .y(d => d.y);
            
            // When drawing lines, add class 'pcp-line' and bind data
            const path = svg.append("g")
                .selectAll("path")
                .data(pcpData)
                .enter().append("path")
                .attr("class", "pcp-line")
                .attr("d", d => {
                    const points = dimensions.map(dim => ({
                        x: dimensions.indexOf(dim) * (width / (dimensions.length - 1)),
                        y: scales[dim.name](d[dim.name])
                    }));
                    return line(points);
                })
                .style("fill", "none")
                .style("stroke", d => colorScale(d.year))
                .style("stroke-width", 1)
                .style("opacity", 0.5);
            
            // Add brushing with theme styling
            g.append("g")
                .attr("class", "brush")
                .each(function(d) {
                    const brush = d3.brushY()
                        .extent([[-10, 0], [10, height]])
                        .on("brush", function(event) {
                            if (!event.selection) return;
                            
                            const [y0, y1] = event.selection;
                            const dimension = d3.select(this.parentNode).datum();
                            
                            path.style("display", d => {
                                const value = scales[dimension.name](d[dimension.name]);
                                return value >= y0 && value <= y1 ? null : "none";
                            });
                        });
                    
                    d3.select(this)
                        .call(brush)
                        .call(g => g.selectAll(".selection")
                            .attr("fill", "#4a4a4a")
                            .attr("stroke", "#666"));
                });
            
            // Add tooltips with theme styling
            path.on("mouseover", function(event, d) {
                d3.select(this)
                    .style("stroke-width", 3)
                    .style("opacity", 1);
                
                const tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("position", "absolute")
                    .style("background-color", "#2a2a2a")
                    .style("color", "#ffffff")
                    .style("padding", "10px")
                    .style("border", "1px solid #444")
                    .style("border-radius", "5px")
                    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)")
                    .style("font-size", "12px");
                
                tooltip.html(`
                    <strong>Year:</strong> ${d.year}<br>
                    <strong>Grid:</strong> ${d.grid}<br>
                    <strong>Laps:</strong> ${d.laps}<br>
                    <strong>Circuit Type:</strong> ${d.circuitType}<br>
                    <strong>Status:</strong> ${d.status}<br>
                    <strong>Reason:</strong> ${d.reasonRetired}<br>
                    <strong>Constructor:</strong> ${d.constructor}<br>
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .style("stroke-width", 1)
                    .style("opacity", 0.5);
                d3.selectAll(".tooltip").remove();
            });
            
            // Drag functions
            function dragstarted(event, d) {
                d3.select(this).raise().classed("active", true);
            }
            
            function dragged(event, d) {
                const thisElem = d3.select(this);
                const xPos = event.x;
                
                // Update the position of the current axis
                thisElem.attr("transform", `translate(${xPos}, 0)`);
                
                // Determine new order of dimensions based on x positions
                const dimensions_copy = [...dimensions];
                const positions = [];
                
                // Get current positions of all axes
                svg.selectAll(".dimension").each(function(d, i) {
                    const transform = d3.select(this).attr("transform");
                    const x = parseFloat(transform.match(/translate\(([^,]+)/)[1]);
                    positions.push({dim: d, x: x, index: i});
                });
                
                // Sort by x position
                positions.sort((a, b) => a.x - b.x);
                
                // Remap dimensions array based on new positions
                const newDimensions = positions.map(p => p.dim);
                
                // Update the path to reflect the new axis positions
                path.attr("d", d => {
                    const points = [];
                    positions.forEach((p, i) => {
                        points.push({
                            x: p.x,
                            y: scales[p.dim.name](d[p.dim.name])
                        });
                    });
                    return line(points);
                });
            }
            
            function dragended(event, d) {
                d3.select(this).classed("active", false);
                
                // After dragging completes, reorder axes to have even spacing
                const positions = [];
                svg.selectAll(".dimension").each(function(d) {
                    const transform = d3.select(this).attr("transform");
                    const x = parseFloat(transform.match(/translate\(([^,]+)/)[1]);
                    positions.push({dim: d, x: x, elem: this});
                });
                
                // Sort by x position
                positions.sort((a, b) => a.x - b.x);
                
                // Update positions with even spacing
                positions.forEach((p, i) => {
                    const newX = i * (width / (dimensions.length - 1));
                    d3.select(p.elem).attr("transform", `translate(${newX}, 0)`);
                });
                
                // Update the paths with the new even spacing
                path.attr("d", d => {
                    const points = [];
                    positions.forEach((p, i) => {
                        const newX = i * (width / (dimensions.length - 1));
                        points.push({
                            x: newX,
                            y: scales[p.dim.name](d[p.dim.name])
                        });
                    });
                    return line(points);
                });
            }

            // After drawing lines, apply country filter if active
            updatePCPHighlightByCountry();
        }).catch(function(error) {
            console.error("Error loading data:", error);
            vizContainer.innerHTML = `<div class="error-message">Failed to load data: ${error.message}</div>`;
        });

    addCountryResetButton();
}
