// --- MAIN APP LOGIC, EVENT LISTENERS, MODAL HANDLING ---

let currentRoomIdForModal = null;

// --- MODAL FUNCTIONS ---
function showWelcomeModal() {
    if (!elements.welcomeModal || (elements.dontShowAgain && localStorage.getItem('hideWelcomeModal') === 'true')) {
        return;
    }
    elements.welcomeModal.classList.remove('hidden');
}
function hideWelcomeModal() {
    if (!elements.welcomeModal) return;
    elements.welcomeModal.classList.add('hidden');
    if (elements.dontShowAgain && elements.dontShowAgain.checked) {
        localStorage.setItem('hideWelcomeModal', 'true');
    }
}

function showSecurityReminder() {
    if (state.hideSecurityReminder || !elements.securityReminderModal) return;
    elements.securityReminderModal.classList.remove('hidden');
}
window.showSecurityReminder = showSecurityReminder; // Make global for data.js

function hideSecurityReminder() {
    if (!elements.securityReminderModal) return;
    elements.securityReminderModal.classList.add('hidden');
    if (elements.dontShowSecurityAgain && elements.dontShowSecurityAgain.checked) {
        state.hideSecurityReminder = true;
    }
}

function showMgisComplianceModal() {
    if (!elements.mgisComplianceModal) return;
    elements.mgisComplianceModal.classList.remove('hidden');
    elements.mgisComplianceCheckbox.checked = false;
    elements.mgisExportConfirmBtn.disabled = true;
}
function hideMgisComplianceModal() {
    if (elements.mgisComplianceModal) {
        elements.mgisComplianceModal.classList.add('hidden');
    }
}

// --- COLLABORATION MODAL FUNCTIONS ---
function showCollaborationModal() {
    if (!elements.collaborationModal) return;
    elements.collaborationModal.classList.remove('hidden');
    if (elements.collaborationUserEmail) {
        elements.collaborationUserEmail.focus();
    }
}

function hideCollaborationModal() {
    if (elements.collaborationModal) {
        elements.collaborationModal.classList.add('hidden');
    }
}

async function setupCollaboration() {
    const email = elements.collaborationUserEmail?.value?.trim();
    const name = elements.collaborationUserName?.value?.trim();
    
    if (!email) {
        alert('Please enter your email address');
        return;
    }

    if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    try {
        showLoading(true);
        
        // Initialize Supabase if not already done
        if (!window.supabaseCollaboration.collaborationState.currentUser) {
            const authSuccess = await window.supabaseCollaboration.authenticateUser(email, name);
            if (!authSuccess) {
                throw new Error('Failed to authenticate user');
            }
        }

        // Initialize collaboration
        const collabSuccess = await window.supabaseCollaboration.initializeCollaboration();
        if (!collabSuccess) {
            throw new Error('Failed to initialize collaboration');
        }

        // Store user info in localStorage for next session
        localStorage.setItem('collaborationUser', JSON.stringify({ email, name }));

        hideCollaborationModal();
        updateCollaborationUI();
        
        // Show success message
        showCollaborationNotification('✅ Collaboration enabled! You can now share tags with your team.');
        
    } catch (error) {
        console.error('Collaboration setup error:', error);
        addError('Failed to set up collaboration: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function updateCollaborationUI() {
    const collabButton = elements.collaborationBtn;
    const collabStatus = elements.collaborationStatus;
    
    if (window.supabaseCollaboration.collaborationState.isOnline) {
        if (collabButton) {
            collabButton.textContent = 'Collaboration ON';
            collabButton.classList.remove('um-button-blue');
            collabButton.classList.add('um-button-maize');
        }
        
        if (collabStatus) {
            collabStatus.classList.remove('hidden');
        }
    } else {
        if (collabButton) {
            collabButton.textContent = 'Enable Collaboration';
            collabButton.classList.remove('um-button-maize');
            collabButton.classList.add('um-button-blue');
        }
        
        if (collabStatus) {
            collabStatus.classList.add('hidden');
        }
    }
}

function showCollaborationNotification(message) {
    // Create a toast notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-16 right-4 bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"/>
            </svg>
            <span class="text-sm">${sanitizeHTML(message)}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function displayTagInfo(tag) {
    if (!elements.tagInfoModal || !elements.tagInfoTitle || !elements.tagInfoContent) return;
    if (!tag || !(tag.isRich || tag.description || tag.link || tag.imageUrl || tag.contact)) return;

    elements.tagInfoTitle.textContent = sanitizeHTML(tag.name);
    let content = '';
    if (tag.imageUrl) content += `<div class="mb-4"><img src="${sanitizeHTML(tag.imageUrl)}" class="tag-image max-w-full rounded-lg border" alt="Tag image for ${sanitizeHTML(tag.name)}" /></div>`;
    if (tag.description) content += `<div class="mb-4"><h4 class="font-medium text-um-blue mb-1">Description</h4><p class="text-gray-600">${sanitizeHTML(tag.description)}</p></div>`;
    if (tag.contact) content += `<div class="mb-4"><h4 class="font-medium text-um-blue mb-1">Contact</h4><p class="text-gray-600">${sanitizeHTML(tag.contact)}</p></div>`;
    if (tag.link) content += `<div class="mb-4"><h4 class="font-medium text-um-blue mb-1">Related Link</h4><a href="${sanitizeHTML(tag.link)}" target="_blank" rel="noopener noreferrer" class="text-um-blue hover:underline">${sanitizeHTML(tag.link)}</a></div>`;
    
    // Add collaboration info if available
    if (tag.collaborative && tag.created_by) {
        content += `<div class="mb-4 p-3 bg-blue-50 rounded-lg"><h4 class="font-medium text-blue-700 mb-1">Collaboration Info</h4><p class="text-blue-600 text-sm">Created by: ${sanitizeHTML(tag.created_by)}</p></div>`;
    }
    
    content += `<div class="text-xs text-gray-500 mt-4 border-t pt-2"><p>Type: ${sanitizeHTML(tag.type)}</p><p class="flex items-center">Color: <span class="inline-block w-4 h-4 rounded-full ml-2 tag-${sanitizeHTML(tag.color)} border"></span> <span class="ml-1">${sanitizeHTML(tag.color)}</span></p><p>Created: ${new Date(tag.created).toLocaleString()}</p></div>`;
    elements.tagInfoContent.innerHTML = content;
    elements.tagInfoModal.classList.remove('hidden');
}
window.displayTagInfo = displayTagInfo; // Make global for ui.js

function handleAddTagClick(roomId) {
    const room = state.processedData.find(r => r.id.toString() === roomId.toString()) || state.currentFilteredData.find(r => r.id.toString() === roomId.toString());
    if (!room || !elements.customTagModal || !elements.modalRoomInfo) return;
    
    currentRoomIdForModal = roomId;
    state.previouslyFocusedElement = document.activeElement;
    elements.modalRoomInfo.textContent = `Room: ${room.rmnbr} - ${room.typeFull} (${room.building || room.bld_descrshort || 'Unknown Building'})`;
    
    // Update user presence for collaboration
    if (window.supabaseCollaboration.collaborationState.isOnline) {
        window.supabaseCollaboration.updateUserPresence(roomId);
    }
    
    updateCustomTagsModalDisplay();
    clearTagForm();
    elements.customTagModal.classList.remove('hidden');
    if(elements.tagNameInput) elements.tagNameInput.focus();
}

function closeTagModal() {
    if (elements.customTagModal) elements.customTagModal.classList.add('hidden');
    if (state.previouslyFocusedElement) state.previouslyFocusedElement.focus();
    
    // Clear user presence
    if (window.supabaseCollaboration.collaborationState.isOnline) {
        window.supabaseCollaboration.updateUserPresence(null);
    }
    
    currentRoomIdForModal = null;
}

function updateCustomTagsModalDisplay() {
    if (!elements.customTagsListModal || !currentRoomIdForModal) return;
    elements.customTagsListModal.innerHTML = '';
    const customTagsForRoom = state.customTags[currentRoomIdForModal] || [];
    const staffTagsForRoom = state.staffTags[currentRoomIdForModal] || [];

    if (staffTagsForRoom.length > 0) {
        elements.customTagsListModal.insertAdjacentHTML('beforeend', '<h4 class="text-sm font-medium text-gray-600 mb-1">Staff:</h4>');
        staffTagsForRoom.forEach(staffTagString => elements.customTagsListModal.appendChild(createTagElementInModal(staffTagString, 'staff', false)));
    }
    if (customTagsForRoom.length > 0) {
        elements.customTagsListModal.insertAdjacentHTML('beforeend', `<h4 class="text-sm font-medium text-gray-600 ${staffTagsForRoom.length > 0 ? 'mt-3' : ''} mb-1">Custom Tags:</h4>`);
        customTagsForRoom.forEach(richTagObj => elements.customTagsListModal.appendChild(createTagElementInModal(richTagObj, 'custom', true)));
    }
    if (staffTagsForRoom.length === 0 && customTagsForRoom.length === 0) elements.customTagsListModal.innerHTML = '<p class="text-sm text-gray-500">No custom tags or staff assigned.</p>';
}

function createTagElementInModal(tagData, type, removable) {
    const template = elements.customTagItemTemplate.content.cloneNode(true);
    const span = template.querySelector('span');
    const tagNameEl = span.querySelector('[data-content="tag-name"]');
    const removeBtn = span.querySelector('[data-action="remove-custom-tag"]');
    let name, color, isRichTagObject = false;

    if (type === 'staff') { 
        name = tagData.startsWith('Staff: ') ? tagData.substring(7) : tagData; 
        color = 'gray'; 
    } else { 
        name = tagData.name; 
        color = tagData.color || 'blue'; 
        isRichTagObject = true; 
    }

    tagNameEl.textContent = name;
    span.classList.add(`tag-${color}`);
    
    // Add collaboration indicator for collaborative tags
    if (tagData.collaborative) {
        const collabIndicator = document.createElement('div');
        collabIndicator.className = 'absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white';
        collabIndicator.title = `Collaborative tag by ${tagData.created_by || 'team member'}`;
        span.style.position = 'relative';
        span.appendChild(collabIndicator);
    }
    
    // Only show rich tag indicator if there's actual rich content (not just color/type changes)
    if (isRichTagObject && (tagData.description || tagData.link || tagData.imageUrl || tagData.contact)) {
        span.classList.add('rich-tag'); span.style.cursor = 'pointer';
        span.onclick = () => displayTagInfo(tagData); // Direct call
    }
    if (!removable || !removeBtn) removeBtn?.remove();
    else {
        removeBtn.dataset.tagId = tagData.id;
        if (['maize', 'yellow', 'orange', 'lightblue'].includes(color)) removeBtn.classList.add('text-um-text-on-maize', 'hover:text-red-700');
        else removeBtn.classList.add('text-gray-300', 'hover:text-white');
    }
    return span;
}

async function addRichTagFromModal() {
    if (!currentRoomIdForModal) return;
    const name = elements.tagNameInput?.value?.trim() || '';
    if (!name) { alert('Please enter a tag name.'); return; }

    const type = elements.tagTypeSelect?.value || 'simple';
    const description = elements.tagDescriptionInput?.value?.trim() || '';
    const link = elements.tagLinkInput?.value?.trim() || '';
    const contact = elements.tagContactInput?.value?.trim() || '';
    const imageUrl = elements.tagImageInput?.value?.trim() || '';
    const selectedColorEl = document.querySelector('#custom-tag-modal .color-option.selected');
    const color = selectedColorEl ? selectedColorEl.dataset.color : 'blue';
    const newRichTag = createRichTag(name, type, description, link, contact, imageUrl, color); // Direct call to utils.js function

    if (!state.customTags[currentRoomIdForModal]) state.customTags[currentRoomIdForModal] = [];
    if (state.customTags[currentRoomIdForModal].some(tag => tag.name.toLowerCase() === newRichTag.name.toLowerCase())) {
        alert(`A tag with the name "${newRichTag.name}" already exists for this room.`); return;
    }
    
    // Add to local state first
    state.customTags[currentRoomIdForModal].push(newRichTag);
    
    // Save to Supabase if collaboration is enabled
    if (window.supabaseCollaboration.collaborationState.isOnline) {
        try {
            const success = await window.supabaseCollaboration.saveTagToSupabase(currentRoomIdForModal, newRichTag);
            if (success) {
                // Mark as collaborative
                newRichTag.collaborative = true;
                newRichTag.created_by = window.supabaseCollaboration.collaborationState.currentUser?.email;
                showCollaborationNotification(`✅ Tag "${newRichTag.name}" shared with team`);
            }
        } catch (error) {
            console.error('Failed to save tag to Supabase:', error);
            // Tag is still saved locally, so continue
        }
    }
    
    clearTagForm();
    updateCustomTagsModalDisplay();
}

function clearTagForm() {
    if (elements.tagNameInput) elements.tagNameInput.value = '';
    if (elements.tagDescriptionInput) elements.tagDescriptionInput.value = '';
    if (elements.tagLinkInput) elements.tagLinkInput.value = '';
    if (elements.tagContactInput) elements.tagContactInput.value = '';
    if (elements.tagImageInput) elements.tagImageInput.value = '';
    if (elements.tagTypeSelect) elements.tagTypeSelect.value = 'simple';
    document.querySelectorAll('#custom-tag-modal .color-option').forEach(opt => opt.classList.remove('selected'));
    const defaultColorOption = document.querySelector('#custom-tag-modal .color-option[data-color="blue"]');
    if (defaultColorOption) defaultColorOption.classList.add('selected');
    if (elements.imagePreviewContainer) elements.imagePreviewContainer.classList.add('hidden');
    if (elements.imagePreview) elements.imagePreview.src = '';
}

async function saveCustomTagsFromModal() {
    closeTagModal();
    state.currentPage = 1;
    await createSearchIndex(); // Direct call to data.js function
    await updateResults();       // Direct call to ui.js function
}

async function removeCustomTag(tagId, roomId) {
    if (!roomId || !tagId) return;
    
    const roomTags = state.customTags[roomId];
    if (!roomTags) return;
    
    const tagIndex = roomTags.findIndex(tag => tag.id.toString() === tagId.toString());
    if (tagIndex === -1) return;
    
    const tagToRemove = roomTags[tagIndex];
    
    // Remove from Supabase if it's a collaborative tag
    if (tagToRemove.collaborative && window.supabaseCollaboration.collaborationState.isOnline) {
        try {
            const success = await window.supabaseCollaboration.deleteTagFromSupabase(roomId, tagToRemove);
            if (success) {
                showCollaborationNotification(`🗑️ Tag "${tagToRemove.name}" removed from team`);
            }
        } catch (error) {
            console.error('Failed to delete tag from Supabase:', error);
            // Continue with local deletion
        }
    }
    
    // Remove from local state
    roomTags.splice(tagIndex, 1);
    updateCustomTagsModalDisplay();
}

function goToPage(pageNumber) {
    const totalItems = state.currentFilteredData.length;
    if (state.resultsPerPage === 0 && pageNumber !== 1) return;
    const totalPages = (state.resultsPerPage === 0) ? 1 : Math.ceil(totalItems / state.resultsPerPage);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        state.currentPage = pageNumber;
        updateResults(); // Direct call to ui.js function
    }
}

function setupEventListeners() {
    if (elements.selectDesktopViewBtn) elements.selectDesktopViewBtn.addEventListener('click', () => setViewMode('desktop', true)); // Direct call
    if (elements.selectMobileViewBtn) elements.selectMobileViewBtn.addEventListener('click', () => setViewMode('mobile', true));   // Direct call
    if (elements.viewSwitchBtn) elements.viewSwitchBtn.addEventListener('click', () => setViewMode(state.currentViewMode === 'desktop' ? 'mobile' : 'desktop')); // Direct call

    if (elements.uploadHeader) elements.uploadHeader.addEventListener('click', toggleUploadSection); // Direct call

    // Collaboration event listeners
    if (elements.collaborationBtn) elements.collaborationBtn.addEventListener('click', () => {
        if (window.supabaseCollaboration.collaborationState.isOnline) {
            // Already connected, show status or disconnect option
            if (confirm('Disable collaboration? This will disconnect you from the team workspace.')) {
                window.supabaseCollaboration.cleanupCollaboration();
                updateCollaborationUI();
                showCollaborationNotification('❌ Collaboration disabled');
            }
        } else {
            showCollaborationModal();
        }
    });
    
    if (elements.collaborationSetupBtn) elements.collaborationSetupBtn.addEventListener('click', setupCollaboration);
    if (elements.collaborationCancelBtn) elements.collaborationCancelBtn.addEventListener('click', hideCollaborationModal);
    if (elements.closeCollaborationBtn) elements.closeCollaborationBtn.addEventListener('click', hideCollaborationModal);
    if (elements.collaborationModal) elements.collaborationModal.addEventListener('click', (e) => { 
        if (e.target === elements.collaborationModal) hideCollaborationModal(); 
    });

    const uploadArea = elements.universalUploadArea;
    const uploadInput = elements.universalUploadInput;
    if (uploadArea && uploadInput) {
        uploadArea.addEventListener('click', (e) => { if (e.target === uploadArea || e.target.closest('#upload-content-normal') || e.target.closest('#upload-content-empty')) uploadInput.click(); });
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); uploadArea.classList.remove('dragover'); });
        uploadArea.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); uploadArea.classList.remove('dragover'); handleFiles(e.dataTransfer.files); }); // Direct call
        uploadInput.addEventListener('change', (e) => handleFiles(e.target.files)); // Direct call
    }

    if (elements.exportTagsBtn) elements.exportTagsBtn.addEventListener('click', (e) => { e.stopPropagation(); exportCustomTags(); }); // Direct call
    if (elements.exportSessionBtn) elements.exportSessionBtn.addEventListener('click', (e) => { e.stopPropagation(); showMgisComplianceModal(); });

    if (elements.closeMgisModal) elements.closeMgisModal.addEventListener('click', hideMgisComplianceModal);
    if (elements.mgisComplianceModal) elements.mgisComplianceModal.addEventListener('click', (e) => { if (e.target === elements.mgisComplianceModal) hideMgisComplianceModal(); });
    if (elements.mgisComplianceCheckbox) elements.mgisComplianceCheckbox.addEventListener('change', (e) => { elements.mgisExportConfirmBtn.disabled = !e.target.checked; });
    if (elements.mgisCancelBtn) elements.mgisCancelBtn.addEventListener('click', hideMgisComplianceModal);
    if (elements.mgisExportConfirmBtn) elements.mgisExportConfirmBtn.addEventListener('click', () => { hideMgisComplianceModal(); exportSession(); }); // Direct call

    const debouncedSearch = debounce(() => { state.currentPage = 1; updateResults(); }, 350); // Direct call

    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            if (elements.searchInputMobile) elements.searchInputMobile.value = state.searchQuery;
            updateAutocomplete(state.searchQuery); // Direct call
            debouncedSearch();
        });
        elements.searchInput.addEventListener('keydown', handleAutocompleteKeydown); // Direct call
        elements.searchInput.addEventListener('blur', () => setTimeout(hideAutocomplete, 150)); // Direct call
    }
    if (elements.searchForm) elements.searchForm.addEventListener('submit', (e) => e.preventDefault());
    if (elements.searchInputMobile) {
        elements.searchInputMobile.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            if (elements.searchInput) elements.searchInput.value = state.searchQuery;
            debouncedSearch();
        });
    }
    if (elements.autocompleteContainer) {
        elements.autocompleteContainer.addEventListener('mousedown', (e) => {
            const item = e.target.closest('[role="option"]');
            if (item) {
                e.preventDefault();
                const selectedValue = item.dataset.item;
                elements.searchInput.value = selectedValue;
                if (elements.searchInputMobile) elements.searchInputMobile.value = selectedValue;
                state.searchQuery = selectedValue;
                hideAutocomplete(); // Direct call
                state.currentPage = 1;
                updateResults(); // Direct call
            }
        });
    }

    ['building', 'floor'].forEach(filterType => {
        const desktopEl = elements[`${filterType}Filter`];
        const mobileEl = elements[`${filterType}FilterMobile`];
        if (desktopEl) desktopEl.addEventListener('change', (e) => { state.activeFilters[filterType] = e.target.value; if (mobileEl) mobileEl.value = e.target.value; state.currentPage = 1; updateResults(); }); // Direct call
        if (mobileEl) mobileEl.addEventListener('change', (e) => { state.activeFilters[filterType] = e.target.value; if (desktopEl) desktopEl.value = e.target.value; state.currentPage = 1; updateResults(); }); // Direct call
    });

    [elements.tagFilter, elements.tagFilterMobile].forEach(el => {
        if (el) el.addEventListener('change', (e) => {
            const selectedTag = e.target.value;
            if (selectedTag && !state.activeFilters.tags.includes(selectedTag)) { state.activeFilters.tags.push(selectedTag); state.currentPage = 1; updateResults(); } // Direct call
            e.target.value = '';
            if (elements.tagFilter) elements.tagFilter.value = '';
            if (elements.tagFilterMobile) elements.tagFilterMobile.value = '';
        });
    });

    if (elements.activeTagsContainer) elements.activeTagsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="remove-tag"]');
        if (btn) { state.activeFilters.tags = state.activeFilters.tags.filter(t => t !== btn.dataset.tag); state.currentPage = 1; updateResults(); } // Direct call
    });
    if (elements.clearTagsBtn) elements.clearTagsBtn.addEventListener('click', () => { state.activeFilters.tags = []; state.currentPage = 1; updateResults(); }); // Direct call

    [elements.resultsPerPage, elements.resultsPerPageMobile].forEach(el => {
        if (el) el.addEventListener('change', (e) => {
            state.resultsPerPage = parseInt(e.target.value, 10);
            if (elements.resultsPerPage) elements.resultsPerPage.value = e.target.value;
            if (elements.resultsPerPageMobile) elements.resultsPerPageMobile.value = e.target.value;
            state.currentPage = 1; updateResults(); // Direct call
        });
    });

    if (elements.prevPageBtn) elements.prevPageBtn.addEventListener('click', () => goToPage(state.currentPage - 1));
    if (elements.nextPageBtn) elements.nextPageBtn.addEventListener('click', () => goToPage(state.currentPage + 1));

    if (elements.closeSecurityModal) elements.closeSecurityModal.addEventListener('click', hideSecurityReminder);
    if (elements.securityOkBtn) elements.securityOkBtn.addEventListener('click', hideSecurityReminder);
    if (elements.closeWelcomeBtn) elements.closeWelcomeBtn.addEventListener('click', hideWelcomeModal);
    if (elements.welcomeOkBtn) elements.welcomeOkBtn.addEventListener('click', hideWelcomeModal);
    if (elements.closeTagInfoBtn) elements.closeTagInfoBtn.addEventListener('click', () => { if (elements.tagInfoModal) elements.tagInfoModal.classList.add('hidden'); });
    if (elements.tagInfoModal) elements.tagInfoModal.addEventListener('click', (e) => { if (e.target === elements.tagInfoModal) elements.tagInfoModal.classList.add('hidden'); });
    if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeTagModal);
    if (elements.addRichTagBtn) elements.addRichTagBtn.addEventListener('click', addRichTagFromModal);
    if (elements.saveTagsBtn) elements.saveTagsBtn.addEventListener('click', saveCustomTagsFromModal);
    if (elements.customTagModal) elements.customTagModal.addEventListener('click', (e) => { if (e.target === elements.customTagModal) closeTagModal(); });
    if (elements.customTagsListModal) elements.customTagsListModal.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action="remove-custom-tag"]');
        if (btn && currentRoomIdForModal) { 
            await removeCustomTag(btn.dataset.tagId, currentRoomIdForModal);
        }
    });
    if (elements.tagNameInput) elements.tagNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addRichTagFromModal(); }});

    function delegateAddTag(event) {
        const button = event.target.closest('[data-action="add-tag"]');
        if (button) { const roomId = button.dataset.id; if (roomId) handleAddTagClick(roomId); }
    }
    if (elements.resultsBody) elements.resultsBody.addEventListener('click', delegateAddTag);
    if (elements.mobileResults) elements.mobileResults.addEventListener('click', delegateAddTag);

    const colorPicker = document.querySelector('#custom-tag-modal .color-picker');
    if (colorPicker) colorPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-option')) { colorPicker.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected')); e.target.classList.add('selected'); }
    });
    if (elements.tagImageInput && elements.imagePreview && elements.imagePreviewContainer) {
        elements.tagImageInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url) { elements.imagePreview.src = url; elements.imagePreview.onload = () => elements.imagePreviewContainer.classList.remove('hidden'); elements.imagePreview.onerror = () => elements.imagePreviewContainer.classList.add('hidden'); }
            else elements.imagePreviewContainer.classList.add('hidden');
        });
    }
}

// Auto-restore collaboration session if user info is stored
async function restoreCollaborationSession() {
    const storedUser = localStorage.getItem('collaborationUser');
    if (storedUser && window.supabaseCollaboration) {
        try {
            const { email, name } = JSON.parse(storedUser);
            
            // Initialize Supabase first
            if (window.supabaseCollaboration.initializeSupabase()) {
                // Small delay to ensure Supabase is ready
                setTimeout(async () => {
                    const authSuccess = await window.supabaseCollaboration.authenticateUser(email, name);
                    if (authSuccess) {
                        const collabSuccess = await window.supabaseCollaboration.initializeCollaboration();
                        if (collabSuccess) {
                            updateCollaborationUI();
                            console.log('✅ Collaboration session restored');
                        }
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Failed to restore collaboration session:', error);
            // Clear invalid stored data
            localStorage.removeItem('collaborationUser');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const elementIds = [
      'upload-header', 'upload-content-section', 'chevron-icon', 'universal-upload-area', 'universal-upload-input',
      'upload-content-normal', 'upload-content-empty',
      'processing-indicator', 'uploaded-files-list', 'data-summary', 'summary-content', 'errors-container', 'errors-list',
      'search-form', 'search-input', 'search-input-mobile', 'autocomplete-container',
      'building-filter', 'building-filter-mobile', 'floor-filter', 'floor-filter-mobile',
      'tag-filter', 'tag-filter-mobile', 'results-per-page', 'results-per-page-mobile',
      'active-tags-container', 'clear-tags-btn',
      'results-table', 'results-body',
      'mobile-results', 'empty-state', 'results-footer', 'results-count',
      'export-tags-btn', 'export-session-btn', 'collaboration-btn',
      'collaboration-modal', 'close-collaboration-btn', 'collaboration-user-email', 'collaboration-user-name',
      'collaboration-setup-btn', 'collaboration-cancel-btn', 'collaboration-status', 'online-users',
      'mgis-compliance-modal', 'close-mgis-modal', 'mgis-compliance-checkbox', 'mgis-cancel-btn', 'mgis-export-confirm-btn',
      'security-reminder-modal', 'close-security-modal', 'security-ok-btn', 'dont-show-security-again',
      'welcome-modal', 'close-welcome-btn', 'welcome-ok-btn', 'dont-show-again',
      'tag-info-modal', 'close-tag-info-btn', 'tag-info-title', 'tag-info-content',
      'custom-tag-modal', 'close-modal-btn', 'modal-room-info', 'tag-name-input', 'tag-type-select',
      'tag-description-input', 'tag-link-input', 'tag-contact-input', 'tag-image-input', 'image-preview-container', 'image-preview',
      'add-rich-tag-btn', 'custom-tags-list-modal', 'save-tags-btn',
      'loading-overlay', 'row-template', 'mobile-card-template', 'tag-span-template', 'autocomplete-item-template',
      'active-tag-template', 'custom-tag-item-template',
      'pagination-controls', 'prev-page-btn', 'page-info', 'next-page-btn',
      'view-selection-modal', 'select-desktop-view-btn', 'select-mobile-view-btn',
      'view-switch-btn', 'view-switch-icon-MOBILE-ICON', 'view-switch-icon-DESKTOP-ICON',
      'desktop-search-section', 'mobile-search-section'
    ];
    elementIds.forEach(id => {
        const camelCaseId = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        elements[camelCaseId] = document.getElementById(id);
    });
    elements.viewSwitchIconMobilePhone = document.getElementById('view-switch-icon-MOBILE-ICON');
    elements.viewSwitchIconDesktopMonitor = document.getElementById('view-switch-icon-DESKTOP-ICON');

    console.log('🏥 Hospital Room Directory - UMich Version with Collaboration Initialized');
    if (localStorage.getItem('hideWelcomeModal') === 'true') state.hideWelcomeModal = true;
    if (elements.resultsPerPage) elements.resultsPerPage.value = state.resultsPerPage.toString();
    if (elements.resultsPerPageMobile) elements.resultsPerPageMobile.value = state.resultsPerPage.toString();

    setupEventListeners();
    initializeAppView(); // Direct call to ui.js function
    showWelcomeModal();
    updatePaginationControls(0); // Direct call to ui.js function
    updateDataSummary();        // Direct call to ui.js function
    updateUploadAreaState();    // Direct call to ui.js function
    
    // Initialize Supabase collaboration
    if (window.supabaseCollaboration) {
        window.supabaseCollaboration.initializeSupabase();
        restoreCollaborationSession();
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.supabaseCollaboration) {
            window.supabaseCollaboration.cleanupCollaboration();
        }
    });
});