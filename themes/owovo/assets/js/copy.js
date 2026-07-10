{{ $src := partial "utils/lib.html" (dict "$" . "type" "clipboard") }}

// Copy Button for Code Blocks

// References
// 1. https://tomspencer.dev/blog/2018/09/14/adding-click-to-copy-buttons-to-a-hugo-powered-blog/
// 2. https://www.dannyguo.com/blog/how-to-add-copy-to-clipboard-buttons-in-hugo/

window.addEventListener("DOMContentLoaded", event => {
    const copyText = '{{ i18n "copy" }}';
    const copiedText = '{{ i18n "copied" }}';

    document.querySelectorAll('.post-body > pre').forEach((e) => {
        const div = document.createElement('div');
        e.parentNode.replaceChild(div, e);
        div.appendChild(e);
    });

    function addCopyButtons(clipboardLike) {
        if (!clipboardLike || typeof clipboardLike.writeText !== 'function') {
            return;
        }

        const divs = document.querySelectorAll('table.lntable, .highlight > pre, .post-body > div > pre');

        divs.forEach((containerEl) => {
            if (containerEl.querySelector('.copy-button')) {
                return;
            }

            let codeBlock;
            if (containerEl.classList.contains('lntable')) {
                codeBlock = containerEl.querySelectorAll('.lntd')[1];
            } else {
                codeBlock = containerEl.querySelector('code');
            }

            if (!codeBlock) {
                return;
            }

            containerEl.parentNode.style.position = 'relative';

            const button = document.createElement('button');
            button.className = 'copy-button';
            button.type = 'button';
            button.innerText = copyText;

            button.addEventListener('click', () => {
                clipboardLike.writeText(codeBlock.innerText).then(() => {
                    /* Chrome doesn't seem to blur automatically,
                       leaving the button in a focused state. */
                    button.blur();

                    button.innerText = copiedText;

                    setTimeout(() => {
                        button.innerText = copyText;
                    }, 1000);
                }).catch((error) => {
                    button.innerText = 'Error';

                    console.error(error);
                });
            });

            containerEl.appendChild(button);
        });
    }

    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        addCopyButtons(navigator.clipboard);
    } else {
        const script = document.createElement('script');
        script.src = '{{ $src }}';
        script.defer = true;
        script.onload = function() {
            const clipboardPolyfill = window.clipboard || (typeof clipboard !== 'undefined' ? clipboard : null);
            addCopyButtons(clipboardPolyfill);
        };
        script.onerror = function(error) {
            console.error(error);
        };

        document.head.appendChild(script);
    }
}, {once: true});
