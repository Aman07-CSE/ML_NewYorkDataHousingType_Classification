document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('prediction-form');
    const priceInput = document.getElementById('price');
    const priceSlider = document.getElementById('price-slider');
    const groupSelect = document.getElementById('neighbourhood_group');
    const searchInput = document.getElementById('neighbourhood-search');
    const hiddenNeighbourhood = document.getElementById('neighbourhood');
    const listContainer = document.getElementById('autocomplete-list');
    const dropdownBtn = document.getElementById('neighbourhood-dropdown-btn');
    
    // Coordinates
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');

    // States Panels
    const welcomeState = document.getElementById('state-welcome');
    const loadingState = document.getElementById('state-loading');
    const successState = document.getElementById('state-success');
    const errorState = document.getElementById('state-error');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');

    // Success Results Elements
    const predTitle = document.getElementById('prediction-title');
    const predLabel = document.getElementById('prediction-label');
    const confidenceScore = document.getElementById('confidence-score');
    
    // Probabilities Elements
    const pctEntire = document.getElementById('pct-entire');
    const fillEntire = document.getElementById('fill-entire');
    const itemEntire = document.getElementById('prob-item-entire');

    const pctPrivate = document.getElementById('pct-private');
    const fillPrivate = document.getElementById('fill-private');
    const itemPrivate = document.getElementById('prob-item-private');

    const pctShared = document.getElementById('pct-shared');
    const fillShared = document.getElementById('fill-shared');
    const itemShared = document.getElementById('prob-item-shared');

    // Data lists loaded from categories.json
    let neighbourhoodGroupList = [];
    let neighbourhoodList = [];

    // Coordinates default mapping based on Borough selection for enhanced UX
    const boroughCoordinates = {
        "Manhattan": { lat: 40.7831, lon: -73.9712 },
        "Brooklyn": { lat: 40.6782, lon: -73.9442 },
        "Queens": { lat: 40.7282, lon: -73.7949 },
        "Bronx": { lat: 40.8448, lon: -73.8648 },
        "Staten Island": { lat: 40.5795, lon: -74.1502 }
    };

    // 1. Fetch Boroughs and Neighbourhoods from categories.json
    fetch('/static/categories.json')
        .then(response => {
            if (!response.ok) throw new Error("Failed to load categories configuration.");
            return response.json();
        })
        .then(data => {
            neighbourhoodGroupList = data.neighbourhood_group || [];
            neighbourhoodList = data.neighbourhood || [];

            // Populate Borough dropdown
            neighbourhoodGroupList.forEach(group => {
                const opt = document.createElement('option');
                opt.value = group;
                opt.textContent = group;
                groupSelect.appendChild(opt);
            });

            // Initialize Neighbourhood Autocomplete
            initializeAutocomplete();
        })
        .catch(err => {
            console.error(err);
            showState(errorState);
            errorMessage.textContent = "Could not load categories list. Make sure the server is hosting static files.";
        });

    // 2. Synchronize Price input and slider
    priceSlider.addEventListener('input', (e) => {
        priceInput.value = e.target.value;
    });

    priceInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val)) return;
        if (val < 10) val = 10;
        if (val > 10000) val = 10000;
        priceSlider.value = Math.min(val, 1000); // Slider max is 1000 for granularity
    });

    // 3. Update Coordinates based on selected Borough (Borough Coordinate presets)
    groupSelect.addEventListener('change', (e) => {
        const selectedBorough = e.target.value;
        if (boroughCoordinates[selectedBorough]) {
            const coords = boroughCoordinates[selectedBorough];
            // Smoothly change coordinates with a dynamic glow
            latitudeInput.value = coords.lat.toFixed(4);
            longitudeInput.value = coords.lon.toFixed(4);
            
            // Add a visual flash effect to highlight coordinate changes
            latitudeInput.classList.add('glow-highlight');
            longitudeInput.classList.add('glow-highlight');
            setTimeout(() => {
                latitudeInput.classList.remove('glow-highlight');
                longitudeInput.classList.remove('glow-highlight');
            }, 800);
        }
    });

    // 4. Custom Autocomplete Combobox for Neighbourhoods
    function initializeAutocomplete() {
        let activeIndex = -1;

        // Render filtered list items
        function renderList(filterText = "") {
            listContainer.innerHTML = "";
            const filtered = neighbourhoodList.filter(item => 
                item.toLowerCase().includes(filterText.toLowerCase())
            );

            if (filtered.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.className = 'autocomplete-item';
                emptyItem.style.color = '#777';
                emptyItem.style.cursor = 'default';
                emptyItem.textContent = "No matching neighbourhoods found";
                listContainer.appendChild(emptyItem);
                return;
            }

            filtered.forEach(item => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.textContent = item;
                div.addEventListener('click', () => {
                    selectNeighbourhood(item);
                });
                listContainer.appendChild(div);
            });
        }

        function selectNeighbourhood(item) {
            searchInput.value = item;
            hiddenNeighbourhood.value = item;
            listContainer.style.display = 'none';
            activeIndex = -1;
            searchInput.classList.remove('input-error');
        }

        // Toggle list on clicking button
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (listContainer.style.display === 'block') {
                listContainer.style.display = 'none';
            } else {
                renderList(searchInput.value);
                listContainer.style.display = 'block';
                searchInput.focus();
            }
        });

        // Open list on focus
        searchInput.addEventListener('focus', () => {
            renderList(searchInput.value);
            listContainer.style.display = 'block';
        });

        // Filter on input typing
        searchInput.addEventListener('input', (e) => {
            renderList(e.target.value);
            listContainer.style.display = 'block';
            hiddenNeighbourhood.value = ""; // Clear selected value since user is typing
        });

        // Handle keyboard navigation (Arrow Up, Arrow Down, Enter)
        searchInput.addEventListener('keydown', (e) => {
            const items = listContainer.getElementsByClassName('autocomplete-item');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                setActive(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + items.length) % items.length;
                setActive(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex > -1 && items[activeIndex]) {
                    items[activeIndex].click();
                }
            } else if (e.key === 'Escape') {
                listContainer.style.display = 'none';
            }
        });

        function setActive(items) {
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
            }
            if (activeIndex > -1 && items[activeIndex]) {
                items[activeIndex].classList.add('active');
                items[activeIndex].scrollIntoView({ block: 'nearest' });
            }
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!document.getElementById('neighbourhood-autocomplete').contains(e.target)) {
                listContainer.style.display = 'none';
                
                // If user left focus without picking a valid item, restore or invalidate
                const currentVal = searchInput.value;
                if (currentVal && !neighbourhoodList.includes(currentVal)) {
                    // Try exact match case insensitive
                    const match = neighbourhoodList.find(n => n.toLowerCase() === currentVal.toLowerCase());
                    if (match) {
                        selectNeighbourhood(match);
                    } else {
                        searchInput.classList.add('input-error');
                        hiddenNeighbourhood.value = "";
                    }
                }
            }
        });
    }

    // 5. helper to change display state smoothly
    function showState(targetState) {
        const states = [welcomeState, loadingState, successState, errorState];
        states.forEach(state => {
            if (state === targetState) {
                state.classList.remove('hidden');
            } else {
                state.classList.add('hidden');
            }
        });
    }

    // 6. Form Submission & Prediction Handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Custom Validation checks
        let isValid = true;

        // Verify Borough is selected
        if (!groupSelect.value) {
            groupSelect.parentElement.classList.add('input-error');
            isValid = false;
        } else {
            groupSelect.parentElement.classList.remove('input-error');
        }

        // Verify Neighbourhood is selected
        if (!hiddenNeighbourhood.value) {
            searchInput.classList.add('input-error');
            isValid = false;
        } else {
            searchInput.classList.remove('input-error');
        }

        // Validate Coordinates
        const lat = parseFloat(latitudeInput.value);
        const lon = parseFloat(longitudeInput.value);
        if (isNaN(lat) || lat < 40.49 || lat > 40.92) {
            latitudeInput.parentElement.classList.add('input-error');
            isValid = false;
        } else {
            latitudeInput.parentElement.classList.remove('input-error');
        }

        if (isNaN(lon) || lon < -74.25 || lon > -73.70) {
            longitudeInput.parentElement.classList.add('input-error');
            isValid = false;
        } else {
            longitudeInput.parentElement.classList.remove('input-error');
        }

        if (!isValid) {
            // Shake the submit button to signal invalid input validation
            const btn = document.getElementById('submit-btn');
            btn.classList.add('shake-btn');
            setTimeout(() => btn.classList.remove('shake-btn'), 500);
            return;
        }

        // Prepare request payload
        const payload = {
            latitude: parseFloat(latitudeInput.value),
            longitude: parseFloat(longitudeInput.value),
            price: parseFloat(priceInput.value),
            minimum_nights: parseInt(document.getElementById('minimum_nights').value),
            number_of_reviews: parseInt(document.getElementById('number_of_reviews').value),
            reviews_per_month: parseFloat(document.getElementById('reviews_per_month').value),
            calculated_host_listings_count: parseInt(document.getElementById('calculated_host_listings_count').value),
            availability_365: parseInt(document.getElementById('availability_365').value),
            neighbourhood_group: groupSelect.value,
            neighbourhood: hiddenNeighbourhood.value
        };

        // Transition to Loading State
        showState(loadingState);

        // Fetch prediction from backend API
        fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    throw new Error(errData.detail || "Server error occurred during prediction.");
                }).catch(() => {
                    throw new Error("Failed to communicate with prediction server.");
                });
            }
            return response.json();
        })
        .then(data => {
            // Output example: {"Predicted_room_type": "Entire home/apt", "Probability": [0.85, 0.12, 0.03]}
            const predictedRoomType = data.Predicted_room_type;
            const probabilities = data.Probability; // Array matching classes: ['Entire home/apt', 'Private room', 'Shared room']

            // Update Success Panel Texts
            predTitle.textContent = predictedRoomType;
            predLabel.textContent = predictedRoomType;

            // Class indexes mapping: 0=Entire, 1=Private, 2=Shared
            const pEntire = probabilities[0] * 100;
            const pPrivate = probabilities[1] * 100;
            const pShared = probabilities[2] * 100;

            // Determine highest confidence score
            const highestProb = Math.max(pEntire, pPrivate, pShared);
            confidenceScore.textContent = highestProb.toFixed(1) + "%";

            // Reset highest class styles
            [itemEntire, itemPrivate, itemShared].forEach(el => el.classList.remove('highest-prob'));

            // Set progress bars and labels with transitions
            setTimeout(() => {
                // Entire Home
                pctEntire.textContent = pEntire.toFixed(1) + "%";
                fillEntire.style.width = pEntire.toFixed(1) + "%";
                if (predictedRoomType === "Entire home/apt") itemEntire.classList.add('highest-prob');

                // Private Room
                pctPrivate.textContent = pPrivate.toFixed(1) + "%";
                fillPrivate.style.width = pPrivate.toFixed(1) + "%";
                if (predictedRoomType === "Private room") itemPrivate.classList.add('highest-prob');

                // Shared Room
                pctShared.textContent = pShared.toFixed(1) + "%";
                fillShared.style.width = pShared.toFixed(1) + "%";
                if (predictedRoomType === "Shared room") itemShared.classList.add('highest-prob');
            }, 100);

            // Show Success State
            showState(successState);
        })
        .catch(err => {
            console.error(err);
            errorMessage.textContent = err.message || "An unexpected error occurred while predicting.";
            showState(errorState);
        });
    });

    // 7. Retry handler
    retryBtn.addEventListener('click', () => {
        showState(welcomeState);
    });

    // Simple key press removal of error classes
    const inputs = [latitudeInput, longitudeInput, groupSelect, searchInput];
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('input-error');
            input.parentElement.classList.remove('input-error');
        });
        if (input.tagName === 'SELECT') {
            input.addEventListener('change', () => {
                input.classList.remove('input-error');
                input.parentElement.classList.remove('input-error');
            });
        }
    });
});
