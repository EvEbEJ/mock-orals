import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import QRCodeStyling from "https://cdn.skypack.dev/qr-code-styling";

const firebaseConfig = {
    apiKey: "GOOGLE_API_KEY",
    authDomain: "mock-orals.firebaseapp.com",
    projectId: "mock-orals",
    storageBucket: "mock-orals.firebasestorage.app",
    messagingSenderId: "980267865246",
    appId: "1:980267865246:web:5605dfbe38d30bc3da178f",
    measurementId: "G-SQMBFDFWR7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


const urlParams = new URLSearchParams(window.location.search);
const JSON_ROOT = "/mock-orals/2024"
var sessionId = urlParams.get("session");


const selectWord = (e) => {
    let sel = undefined;
    
    // Check if clicked element is a span
    if (e.target.nodeName == 'SPAN') {
        $(e.target).toggleClass('has-error');
        return;
    } else if (e.target.nodeName == 'DFN') {
        sel = window.getSelection();
        let node = e.target.nextSibling;
        sel.collapse(node, 0);
        for (; node.nextSibling != null; node = node.nextSibling) {
            if (node.nodeName == 'DFN') break;
        }
        if (node.nodeName == 'SUP')
            sel.extend(node);
        else
            sel.extend(node, node.length);
    }

    // Check if clicked element is a paragraph (P)
    if (e.target.nodeName == 'P') {
        sel = window.getSelection();
        let range = sel.getRangeAt(sel.rangeCount - 1);
        sel.collapseToStart();
        sel.modify('move', 'forward', 'character');
        sel.modify('move', 'backward', 'word');
        sel.extend(range.endContainer, range.endOffset);
        sel.modify('extend', 'backward', 'character');
        sel.modify('extend', 'forward', 'word');
    }
    
    if (sel === undefined) return;
    
    let range = sel.getRangeAt(0); // Get the first selection range
    let startNode = range.startContainer;
    let endNode = range.endContainer;

    // Create a document fragment to extract the selected content and manipulate it
    let docFrag = range.cloneContents();

    // Get all spans within the document fragment
    let spans = docFrag.querySelectorAll('span');

    // Toggle the 'has-error' class on each span within the selection
    spans.forEach((span) => {
        span.classList.toggle('has-error');
    });

    // Now reinsert the modified content back to the DOM
    range.deleteContents();  // Remove the original selected content
    range.insertNode(docFrag);  // Reinsert the modified content (with the updated spans)

    // Collapse the selection to the end after the changes
    sel.collapseToEnd();
}

// Normalize reference function to clean up any extra spaces or characters
function normalizeReference(reference) {if (reference) {
    return reference.trim().toLowerCase().replace(/\s+/g, ' ');
    } else {
        console.error("Reference is undefined or null:", reference); // Log undefined reference
        return ''; // Return empty string if reference is undefined or null
    }
}

function generateQrCode(url) {
    document.getElementById("passage-share-ctr").style.display = "";
    document.getElementById("qrcode").innerHTML = "";
                      
    const qrCode = new QRCodeStyling({
        width: 100,
        height: 100,
        data: url,
        dotsOptions: { color: "#5a90bd", type: "extra-rounded" },
        backgroundOptions: { color: "#fff" }
    });
    
    qrCode.append(document.getElementById("qrcode"));
}

if (sessionId) {
    let versesData = []; // This will hold the data from the JSON file

    // generate qr code
    generateQrCode(window.location.href)

    // Load the JSON file with verses (using fetch or a local JSON file)
    
    const sessionRef = doc(db, "sessions", sessionId); // Get reference to session document
    getDoc(sessionRef).then(docSnapshot => {
        if (docSnapshot.exists()) {
            const sessionData = docSnapshot.data();
            console.log(sessionData.jsonFile)
            
            fetch(`${JSON_ROOT}/${sessionData.jsonFile}`)
                .then(response => response.json())
                .then(data => {
                    versesData = data;

                    // Now filter the verses based on the session data
                    const mode = urlParams.get("mode") || "ref"; // Default to "ref" mode if not specified
        
                    // Filter verses to match those in the JSON file
                    const matchedVerses = sessionData.verses.map(verse => {
                        const normalizedSessionReference = normalizeReference(verse);
                        console.log("Checking for verse:", normalizedSessionReference); // Debug: log each verse being checked
                        const matchedVerse = versesData.find(v => normalizeReference(v.reference) === normalizedSessionReference);
                        console.log("Matched verse:", matchedVerse); // Debug: log matched verse if found
                        return matchedVerse ? (mode === "ref" ? matchedVerse : `${matchedVerse.reference}: ${matchedVerse.text}`) : null;
                    }).filter(Boolean); // Filter out any null values (when no match found)
        
                    console.log("Matched verses:", matchedVerses); // Debug: log the final matched verses
        
                    var container = $('#passages').html(`<h2>${sessionData.division} &mdash; ${sessionData.version}</h2><h4>${sessionData.words} words (${sessionData.wpm} words per minute)</h4>`);
                    displayVerses(container, matchedVerses)
                })
            .catch(error => {
                console.error("Error loading JSON file:", error);
            });
        } else {
            alert("Session not found!");
        }
    }).catch(error => {
        console.error("Error fetching session:", error);
    });
}

function displayVerses(container, passages) {
    container.off('click', '.passage');

    passages.forEach((passage, i) => {
        container.append(`<div class="passage">
                <div class="reference-top">
                    <span>${passage.reference}</span>
                    <span class="number">${i + 1}</span>
                </div>
                <p>${passage.cards.join(' ').replace(/\(\s*(\d+)\s*\)/g, '<dfn>($1)</dfn>').replace(/(?<!<[^>]*)([a-zA-Z]*\'?[a-zA-Z]+)/g,'<span>$1</span>')}</p>
                <div class="reference-bottom">
                    <span>${passage.reference}</span>
                    <a href="javascript:void(0)" onclick="clearErrors(event)">start over</a>
                </div>
            </div>`
        )
    });

    container.on('click', '.passage', selectWord);
}


(() => {
    const DEBUG_URL = ""
    const valueOf = (node) => node.val() || node.prop('placeholder');
    const setDefault = (node, value) => node.prop('placeholder', value);
    
    const formValid = (valid = !document.querySelectorAll('.has-error').length) => {
        document.getElementById('generate').disabled = !valid;
    };
    
    const speechRateChanged = () => {
        let min_wpm = Number(valueOf($('#min_wpm'))),
            max_wpm = Number(valueOf($('#max_wpm')));
        if (isNaN(min_wpm) || isNaN(max_wpm) || min_wpm > max_wpm) {
            $('#speech_rate_group').addClass('has-error');
            formValid(false);
        } else {
            $('#speech_rate_group').removeClass('has-error');
            formValid();
        }
    };
    
    document.addEventListener('DOMContentLoaded', () => {
        $('#division').change(function () {
            let division = $(this), min_wpm, max_wpm, max_words;
            switch (division.val()) {
                case 'Senior':
                    min_wpm = 130;
                    max_wpm = 150;
                    max_words = 220;
                    break;
                case 'Junior':
                    min_wpm = 115;
                    max_wpm = 130;
                    max_words = 200;
                    break;
                case 'Primary':
                    min_wpm = 100;
                    max_wpm = 115;
                    max_words = 150;
                    break;
                default:
                    division.addClass('has-error');
                    formValid(false);
                    return;
            }
            setDefault($('#min_wpm'), min_wpm);
            setDefault($('#max_wpm'), max_wpm);
            setDefault($('#max_words'), max_words);
            formValid();
        });

        $('#min_wpm, #max_wpm').change(speechRateChanged);
        
        $('#max_words').change(function () {
            let max_words = Number(valueOf($(this)));
            if (isNaN(max_words) || max_words < 1) {
                $('#max_words_group').addClass('has-error');
                formValid(false);
            } else {
                $('#max_words_group').removeClass('has-error');
                formValid();
            }
        });

        $('.form-control').trigger('change');

        $('#generate, #generate-btn').click(() => {
            generatePassages();
        });
    });

    const generatePassages = () => {
        let version = $('#version').val(),
            division = $('#division').val();
        
        const jsonFile = `${division.toLowerCase()}-${version.toLowerCase()}.json`

        fetch(`${JSON_ROOT}/${jsonFile}`)
            .then(response => response.json())
            .then(passages => {
                console.log(`received ${passages.length} passages`);
                let max_words = Number(valueOf($('#max_words')));
                if (!isNaN(max_words)) {
                    passages = passages.filter(passage => passage.word_count <= max_words);
                    console.log(`${passages.length} passages remaining after filtering`);
                }

                let min_wpm = Number(valueOf($('#min_wpm'))),
                    max_wpm = Number(valueOf($('#max_wpm')));
                let attempt, words, wpm;
                for (attempt = 0; attempt < 1000000; attempt++) {
                    let picked = pick(passages, 12);
                    words = picked.reduce((total, p) => total + p.word_count, 0);
                    wpm = words / 8;
                    if (min_wpm <= wpm && wpm <= max_wpm) {
                        console.log(`words = ${words}, wpm = ${wpm}`);
                        passages = picked;
                        break;
                    }
                }
                if (attempt >= 1000000) {
                    $('#passages').html('<span class="text-danger">Maximum attempts reached. Please adjust parameters and try again.</span>');
                    $('#generate').prop('disabled', false);
                    return;
                }

                var container = $('#passages').html(`<h2>${division} &mdash; ${version}</h2><h4>${words} words (${Math.round(wpm)} words per minute)</h4>`);
                displayVerses(container, passages)

                // Generate a session ID and store the selected passages in Firestore
                var newID = false
                if (!sessionId)
                {
                    sessionId = Math.random().toString(36).substring(2, 10); // Generate a simple random session ID
                    newID = true
                }
                let selectedVerses = passages.map(passage => passage.reference);

                setDoc(doc(db, "sessions", sessionId), { 
                    verses: selectedVerses, 
                    jsonFile: jsonFile,
                    expiryTime: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
                    division: division,
                    version: version,
                    words: words,
                    wpm: Math.round(wpm),
                })
                    .then(() => {
                        var url = new URL(window.location);
                        url.searchParams.set("session", sessionId);
                        window.history.pushState({}, "", url);
                        if (newID) {
                            generateQrCode(url.href);
                        }
                    })
                    .catch(error => console.error("Error saving session: ", error));
            })
            .catch(error => {
                console.error(error)
                $('#passages').html(`<span class="text-danger">${error}</span>`);
            })
            .finally(() => {
                $('#generate').prop('disabled', false);
            });
    };

    const pick = (items, count) => {
        let indices = Array.from(items, (_, i) => i),
            chosen = [];
        while (indices.length && chosen.length < count) {
            let i = Math.floor(Math.random() * indices.length);
            chosen.push(items[indices.splice(i, 1)[0]]);
        }
        return chosen;
    };

    const clearErrors = (e) => {
        $(e.target).closest('.passage').find('.has-error').removeClass('has-error');
    };
})();
