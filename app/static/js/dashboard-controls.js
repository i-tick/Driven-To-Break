// Dashboard Controls for Visualization Cards

document.addEventListener('DOMContentLoaded', function() {
    // Set up expand buttons
    setupExpandButtons();
});

function setupExpandButtons() {
    const expandButtons = document.querySelectorAll('.expand-button');
    
    expandButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.visualization-card');
            const cardId = card.id;
            const cardTitle = card.querySelector('h3').textContent;
            
            // Toggle expanded/collapsed state
            if (card.classList.contains('expanded-view')) {
                // Collapse the card
                collapseCard(card);
            } else {
                // Expand the card
                expandCard(card, cardId, cardTitle);
            }
        });
    });
    
    // Close expanded view when ESC key is pressed
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const expandedCard = document.querySelector('.expanded-view');
            if (expandedCard) {
                collapseCard(expandedCard);
            }
        }
    });
}

function expandCard(card, cardId, cardTitle) {
    // Store the original parent and position
    card.originalParent = card.parentNode;
    card.originalPosition = Array.from(card.parentNode.children).indexOf(card);
    
    // Change button icon to collapse
    const buttonSvg = card.querySelector('.expand-button svg');
    buttonSvg.innerHTML = '<path d="M5,5H9V3H3V9H5V5M19,3V9H21V3H19M19,19H21V13H19V19M3,21H9V19H5V15H3V21"/>';
    card.querySelector('.expand-button').setAttribute('title', 'Collapse visualization');
    
    // Clone the filter controls for the expanded view
    const expandedControls = document.createElement('div');
    expandedControls.className = 'expanded-controls';
    expandedControls.innerHTML = `
        <div class="filter-group">
            <label for="${cardId}-season">Season:</label>
            <select id="${cardId}-season" class="filter-select">
                <option value="all">All Seasons</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
            </select>
        </div>
        <div class="filter-group">
            <label for="${cardId}-team">Team:</label>
            <select id="${cardId}-team" class="filter-select">
                <option value="all">All Teams</option>
                <option value="mercedes">Mercedes</option>
                <option value="redbull">Red Bull</option>
                <option value="ferrari">Ferrari</option>
                <option value="mclaren">McLaren</option>
            </select>
        </div>
        <button class="button dashboard-button">Apply Filters</button>
    `;
    
    // Add classes for expanded view
    card.classList.add('expanded-view');
    document.body.style.overflow = 'hidden'; // Prevent scrolling on the body
    
    // Move the card to be a direct child of the body
    document.body.appendChild(card);
    
    // Add the controls to the expanded view
    card.appendChild(expandedControls);
    
    // Trigger resize to redraw the visualization for the new size
    window.dispatchEvent(new Event('resize'));
}

function collapseCard(card) {
    // Remove the expanded-controls if they exist
    const expandedControls = card.querySelector('.expanded-controls');
    if (expandedControls) {
        card.removeChild(expandedControls);
    }
    
    // Change button icon back to expand
    const buttonSvg = card.querySelector('.expand-button svg');
    buttonSvg.innerHTML = '<path d="M3,3H9V5H5V9H3V3M21,3V9H19V5H15V3H21M3,21V15H5V19H9V21H3M19,21H15V19H19V15H21V21"/>';
    card.querySelector('.expand-button').setAttribute('title', 'Expand visualization');
    
    // Remove expanded view class
    card.classList.remove('expanded-view');
    document.body.style.overflow = ''; // Restore scrolling on the body
    
    // Move the card back to its original position
    if (card.originalParent) {
        if (card.originalPosition < card.originalParent.children.length) {
            card.originalParent.insertBefore(card, card.originalParent.children[card.originalPosition]);
        } else {
            card.originalParent.appendChild(card);
        }
    }
    
    // Trigger resize to redraw the visualization for the new size
    window.dispatchEvent(new Event('resize'));
} 