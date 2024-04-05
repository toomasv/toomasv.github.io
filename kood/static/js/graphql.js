import {
  createProgressGraph,
  createXpByProjectGraph,
} from "/kood/static/js/graphs.js";

const loadUserProfile = async () => {
  const userToken = sessionStorage.getItem("JWT");
  if (userToken) {
    document.getElementById("logoutBtn").addEventListener("click", () => {
      sessionStorage.removeItem("JWT");
      window.location.href = "/kood/";
    });

    const showData = async (type = "div-01\\/[-\\\\w]+$") => {
      const userData = await getUserData(userToken, type);
      const xpByProject = await getXpByProject(userToken, type);
      const userProgress = await getUserProgress(userToken, type);

      createUserData(userData);
      document.getElementById("lineGraph").innerHTML = "";
      createProgressGraph(userProgress, userData.totalXp);
      document.getElementById("barGraph").innerHTML = "";
      createXpByProjectGraph(xpByProject);
    };
    showData();

    document
      .getElementById("itemSelection")
      .addEventListener("change", async (e) => {
        switch (e.target.value) {
          case "progress":
            showData("div-01\\/[-\\\\w]+$");
            break;
          case "piscine-go":
            showData("piscine-go");
            break;
          case "piscine-js":
            showData("div-01\\/piscine-js");
            break;
        }
      });
  } else {
    window.location.href = "/";
  }
};

// Nested query
const getUserData = async (userToken, type = "div-01\\/[-\\\\w]+$") => {
  const query = `{
        user {
            login
            firstName
            lastName
            auditRatio
            email
            attrs
            totalUp
            totalDown
            transactions_aggregate (
              where: {
                path: {_regex: "^\\/johvi\\/${type}"}
                type: {_eq:"xp"}
              },
            ) {
            	aggregate {
            		sum {amount}
 		        	} 
            }
          }
        }
    `;
  console.log("query:", query);
  const queryBody = {
    query,
  };

  const results = await getQueryResults(queryBody, userToken);
  const totalXp =
    results.data.user[0].transactions_aggregate.aggregate.sum.amount;
  /*
              transactions(
                where: {
                    path: {_regex: "^\\/johvi\\/${type}"}
                    type: {_eq:"xp"}
                },
            )   {
                    amount
                }
            }

  const totalXp = results.data.user[0].transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0
  );
 
  console.log("totalXP1:", totalXp);
  console.log("totalXP2:", results.data.user[0].transactions_aggregate.aggregate.sum.amount);
*/
  const userData = {
    username: results.data.user[0].login,
    firstName: results.data.user[0].firstName,
    lastName: results.data.user[0].lastName,
    auditRatio: results.data.user[0].auditRatio,
    auditXpDone: results.data.user[0].totalUp,
    auditXpReceived: results.data.user[0].totalDown,
    attrs: results.data.user[0].attrs,
    totalXp,
  };

  return userData;
};

// Variable query
const getXpByProject = async (userToken, type = "div-01\\/[-\\\\w]+$") => {
  const query = `
        query GetXpByProject($transactionType: String!) {
            transaction(
                where: {
                    path: { _regex: "^\\/johvi\\/${type}" }
                    type: { _eq: $transactionType }
                },
                order_by: { amount: asc }
            ) {
                amount
                path
            }
        }
    `;

  const queryBody = {
    query: query,
    variables: {
      transactionType: "xp",
    },
  };

  const results = await getQueryResults(queryBody, userToken);

  let pathStart;
  if (RegExp("piscine-js").test(type)) pathStart = "/johvi/div-01/piscine-js/";
  else if (RegExp("piscine-go").test(type)) pathStart = "/johvi/piscine-go/";
  else pathStart = "/johvi/div-01/";

  const xpByProjectData = results.data.transaction.map((transaction) => {
    const updatedPath = transaction.path.replace(pathStart, "");
    return { ...transaction, path: updatedPath };
  });
  return xpByProjectData;
};

// Normal query
const getUserProgress = async (userToken, type = "div-01\\/[-\\\\w]+$") => {
  const query = `
        {
            transaction(
                where: {
                    path: { _regex: "^\\/johvi\\/${type}" }
                    type: { _eq: "xp" }
                },
                order_by: { createdAt: asc }
            ) {
                amount
                createdAt
            }
        }
    `;

  const queryBody = {
    query: query,
  };

  const results = await getQueryResults(queryBody, userToken);

  return results.data.transaction;
};

const getQueryResults = async (queryBody, userToken) => {
  const url = "https://01.kood.tech/api/graphql-engine/v1/graphql";

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + userToken,
    },
    body: JSON.stringify(queryBody),
  };
  try {
    const response = await fetch(url, options);
    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      const statusMsg = await response.text();
      return statusMsg;
    }
  } catch (error) {
    console.error(error);
  }
};

const createUserData = (data) => {
  document.getElementById("innerUserData").innerHTML = `
  <h1 id="username">${data.username}</h1>
  <a>Name:</a>
  <a id="firstName">${data.firstName}</a>
  <a id="lastName">${data.lastName}</a><br>
  <a>Location:</a>
  <a id="location">${data.attrs.addressCity}, ${
    data.attrs.addressCountry
  }</a><br>
  <a>Age:</a>
  <a id="age">${calculateAge(data.attrs.dateOfBirth)} years old</a><br>
`;
  document.getElementById("auditData").innerHTML = `
  <h1>XP info</h1>
  <a>Total:</a>
  <a id="xp">${format2(data.totalXp, true)}</a><br>
  <a>Audits earned:</a>
  <a id="auditsDone">${format2(data.auditXpDone, true)}</a><br>
  <a>Audits received:</a>
  <a id="auditsReceived">${format2(data.auditXpReceived, true)}</a><br>
  <a>Audit ratio:</a>
  <a id="auditRatio">${format2(data.auditRatio)}</a><br>
  `;
};

const calculateAge = (dateOfBirth) => {
  const dob = new Date(dateOfBirth);
  const currentDate = new Date();

  let age = currentDate.getFullYear() - dob.getFullYear();

  if (
    currentDate.getMonth() < dob.getMonth() ||
    (currentDate.getMonth() === dob.getMonth() &&
      currentDate.getDate() < dob.getDate())
  ) {
    age--;
  }

  return age;
};

// Round number to 2 decimals and add unit if needed
const format2 = (number, unit = false) => {
  number = Number(number);
  if (unit) {
    if (number < 1000000) {
      number = number / 1000;
      unit = " kB";
    } else {
      number = number / 1000000;
      unit = " MB";
    }
  }
  let rounded = number.toFixed(2);
  console.log("rounded:", rounded);
  if (rounded == 0) {
    rounded = "0";
  } else {
    rounded = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toString();
  }
  return rounded + (unit ? unit : "");
};

window.onload = loadUserProfile;
