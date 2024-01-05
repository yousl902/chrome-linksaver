// TODO: when hovering on a button, explain what it does
// style the page
const addCheckboxListener = (groupId) => {
  const checkbox = document.getElementById("checkbox-" + groupId);
  const ulElement = document.getElementById("ul-" + groupId);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      for (const li of ulElement.children) {
        li.style.display = "block";
      }
    } else {
      for (const li of ulElement.children) {
        li.style.display = "none";
      }
    }
  });
};

const addGroupButtonListener = (groupId) => {
  const button = document.getElementById("button-" + groupId);
  const ulElement = document.getElementById("ul-" + groupId);

  let groupName = ulElement.dataset.groupName;
  button.addEventListener("click", async () => {
    let tabPromises = [];
    for (const li of ulElement.children) {
      let url = li.children[0].href;
      let tabPromise = new Promise((resolve) => {
        chrome.tabs.create({ active: false, url: url }, (tab) => {
          resolve(tab.id);
        });
      });
      tabPromises.push(tabPromise);
    }

    Promise.all(tabPromises).then((tabIds) => {
      chrome.tabs.group({ tabIds: tabIds }, (groupId) => {
        chrome.tabGroups.update(groupId, { title: groupName });
      });
    });
  });
};

const mainSection = document.getElementById("main-section");
function renderGroup(group, groupId, groupName) {
  if (document.getElementById("div-singles") && groupId === "singles") {
    document.getElementById("div-singles").remove();
  }
  let newLinkListEl = "";
  newLinkListEl += `
    <div class="group-div" id="${"div-" + groupId}">
    	<div class="inp-btn-container">
	  <input class="group-checkbox" type="checkbox" id="${"checkbox-" + groupId}">
	  <button class="group-button" id="${"button-" + groupId}">${groupName}</button>
    	</div>
	<div class="ul-div">
	  <ul id="${"ul-" + groupId}" data-group-name="${groupName}">
	  </ul>
	</div>
    </div>`;

  mainSection.insertAdjacentHTML("beforeend", newLinkListEl);
  let ulElement = document.getElementById("ul-" + groupId);
  for (const tab of group) {
    let linkItem = "";
    const parsedUrl = new URL(tab.url);
    const domainName = parsedUrl.hostname;
    linkItem += `
      <li>
	<a href='${tab.url}' target='_blank' data-header='temp' title='${tab.url}'>${domainName}</a>
      </li>`;
    ulElement.innerHTML += linkItem;
  }
  document
    .getElementById("checkbox-" + groupId)
    .addEventListener("change", addCheckboxListener(groupId));
  document
    .getElementById("button-" + groupId)
    .addEventListener("click", addGroupButtonListener(groupId));
}

async function getGroupName(groupId) {
  const g = await chrome.tabGroups.get(groupId);
  return g.title;
}

async function getGroupId() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const tab = tabs[0];
  const groupId = tab.groupId;
  for (const group of linksFromLocalStorage.groups) {
    if (group.groupId === groupId) {
      alert("Group already exists");
      return;
    }
  }
  if (groupId < 0) {
    alert("To add a group, click on a tab in the group first.");
  } else {
    return groupId;
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

let linksFromLocalStorage = JSON.parse(localStorage.getItem("links"));
if (linksFromLocalStorage) {
  let tabsOfGroup = [];
  for (const group of linksFromLocalStorage.groups) {
    for (const tab of group.tabsOfGroup) {
      tabsOfGroup.push(tab);
    }
    renderGroup(group.tabsOfGroup, group.groupId, group.groupName);
  }
} else {
  localStorage.setItem(
    "links",
    JSON.stringify({
      groups: [{ groupId: "singles", groupName: "singles", tabsOfGroup: [] }],
    }),
  );
  linksFromLocalStorage = JSON.parse(localStorage.getItem("links"));
}

const addInputBtn = document.getElementById("add-input-btn");
const input = document.getElementById("input");
addInputBtn.addEventListener("click", () => {
  const value = input.value;
  if (!isValidUrl(value)) {
    alert("Please enter a valid url");
    return;
  }
  let singles = linksFromLocalStorage.groups.find((group) => {
    if (group.groupId === "singles") {
      return group;
    }
  });
  let url = new URL(value);
  singles.tabsOfGroup.push({ url: url.href });
  localStorage.setItem("links", JSON.stringify(linksFromLocalStorage));
  renderGroup(singles.tabsOfGroup, "singles", "singles");
  input.value = "";
});

const addTabBtn = document.getElementById("add-tab-btn");
addTabBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    let singles = linksFromLocalStorage.groups.find((group) => {
      if (group.groupId === "singles") {
        return group;
      }
    });
    singles.tabsOfGroup.push(tab);
    localStorage.setItem("links", JSON.stringify(linksFromLocalStorage));
    renderGroup(singles.tabsOfGroup, "singles", "singles");
  });
});

const addGroupBtn = document.getElementById("add-group-btn");
addGroupBtn.addEventListener("click", () => {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    getGroupId().then((groupId) => {
      let tabsOfGroup = [];
      if (tabs.length > 0) {
        for (const tab of tabs) {
          if (tab.groupId === groupId) {
            tabsOfGroup.push(tab);
          }
        }
      }
      getGroupName(groupId).then((groupName) => {
        let group = { tabsOfGroup, groupId, groupName };
        linksFromLocalStorage.groups.push(group);
        localStorage.setItem("links", JSON.stringify(linksFromLocalStorage));
        renderGroup(tabsOfGroup, groupId, groupName);
      });
    });
  });
});

const deleteInputBtn = document.getElementById("delete-btn");
deleteInputBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all links?")) {
    localStorage.setItem(
      "links",
      JSON.stringify({
        groups: [{ groupId: "singles", groupName: "singles", tabsOfGroup: [] }],
      }),
    );
    mainSection.innerHTML = "";
  }
});
