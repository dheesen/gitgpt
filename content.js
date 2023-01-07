function createCodeEditor() {
    const body = document.querySelector('body');
    body.insertAdjacentHTML('afterbegin', '<div id="code-editor"></div>');
    const codeEditor = document.querySelector('#code-editor');
    codeEditor.insertAdjacentHTML('afterbegin', '<textarea id="code-fragment"></textarea>');
    const textarea = document.querySelector('#code-fragment');
    textarea.insertAdjacentHTML(
        'afterend',
        '<button id="push-to-github" class="btn flex justify-center gap-2 btn-neutral border-0 md:border">Push to GitHub</button>'
    );
}

function addEventListeners() {
    const pushButton = document.querySelector('#push-to-github');
    pushButton.addEventListener('click', pushCode);
}

const GITHUB_TOKEN = 'YOUR_PERSONAL_GITHUB_TOKEN';
const GITHUB_USERNAME = 'YOUR_GITHUB_USERNAME';
const GITHUB_REPO = 'YOUR_GITHUB_REPO';
const GITHUB_BRANCH = 'BRANCH_YOU_WANT_TO_PUSH_TO';
let lastFilename = '';

async function pushCode() {
    try {
        // Get the selected text
        const code = document.querySelector('#code-fragment').value;

        // Get the current date and time
        const date = new Date();
        // Generate a default filename using the date and time
        let filename = `code-${date.toISOString()}.txt`;
        if (lastFilename) {
            // If a filename has been used before, use it as the default
            filename = lastFilename;
        }

        // Prompt the user for a filename
        filename = prompt('Enter a filename for the code:', filename);
        if (!filename) {
            // If the user cancels the prompt, stop the function
            return;
        }
        lastFilename = filename; // Save the filename for next time

        // Create a new Git blob object containing the file content
        const blobResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/git/blobs`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/vnd.github.raw',
                },
                body: JSON.stringify({
                    content: code,
                    encoding: 'utf-8',
                }),
            }
        );
        const blob = await blobResponse.json();
        if (!blobResponse.ok) {
            throw new Error(
                `There was an error creating the Git blob object (status ${blobResponse.status}).`
            );
        }

        // Get the latest commit on the branch
        const commitResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/
git/refs/heads/${GITHUB_BRANCH}`,
            {
                headers: {
                    Authorization: `Token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/vnd.github.raw',
                },
            }
        );
        const commit = await commitResponse.json();
        if (!commitResponse.ok) {
            throw new Error(
                `There was an error getting the latest commit (status ${commitResponse.status}).`
            );
        }

        // Create a new Git tree object containing the new file
        const treeResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/git/trees`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    base_tree: commit.object.sha,
                    tree: [
                        {
                            path: filename,
                            mode: '100644',
                            type: 'blob',
                            sha: blob.sha,
                        },
                    ],
                }),
            }
        );
        const tree = await treeResponse.json();
        if (!treeResponse.ok) {
            throw new Error(
                `There was an error creating the Git tree object (status ${treeResponse.status}).`
            );
        }

        // Create a new commit
        const commitData = {
            message: `Add ${filename} to ${GITHUB_BRANCH} branch`,
            tree: tree.sha,
            parents: [commit.object.sha],
        };
        const commit2Response = await fetch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/git/commits`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(commitData),
            }
        );
        const commit2 = await commit2Response.json();
        if (!commit2Response.ok) {
            throw new Error(
                `There was an error creating the commit (status ${commit2Response.status}).`
            );
        }

        // Update the branch to point to the new commit
        const updateBranchResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sha: commit2.sha,
                }),
            }
        );
        if (!updateBranchResponse.ok) {
            throw new Error(
                `There was an error updating the branch (status ${updateBranchResponse.status}).`
            );
        }

        alert('Code successfully pushed to GitHub');
    } catch (error) {
        alert(error.message);
    }
}

createCodeEditor();
addEventListeners();

