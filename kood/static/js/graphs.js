export const createProgressGraph = (transactions, totalXp) => {
  const graphHeightIncrements = roundToNearest25(totalXp / 10000);

  const dates = transactions.map(
    (transaction) => new Date(transaction.createdAt)
  );
  const earliestTime = new Date(Math.min(...dates));

  const latestTime = new Date(Math.max(...dates));
  const timeDiff = latestTime - earliestTime;
  const dayDiff = timeDiff / 1000 / 60 / 60 / 24;
  console.log("timeDiff:", dayDiff);

  if (dayDiff > 30 && latestTime.getDate() !== 1) {
    // set latestTime to the first of the next month, that way the months comparison lines are consistent
    latestTime.setMonth(latestTime.getMonth() + 1);
    latestTime.setDate(1);
  }

  // add the baseline to the beginning of the transactions array
  if (dayDiff > 30 && earliestTime.getDate() !== 1) {
    earliestTime.setDate(1); // set earliestTime to the first of the first transaction month
    transactions.unshift({
      amount: 0,
      createdAt: Math.min(...dates),
    });
  }

  const graphWidth = 440;
  const graphHeight = 300;
  const xPadding = 50;
  const yPadding = 20;

  totalXp /= 1000;
  const xScale = (graphWidth - xPadding * 2) / (latestTime - earliestTime);
  const yScale = (graphHeight - yPadding * 2) / totalXp;

  const graphData = transactions.map((transaction) => {
    totalXp -= transaction.amount / 1000;
    return {
      x: (new Date(transaction.createdAt) - earliestTime) * xScale + xPadding,
      y: graphHeight - (totalXp * yScale + yPadding),
    };
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  svg.setAttribute("viewBox", "0 0 400 300");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const backgroundLineHorizontalDistance =
    graphHeight / (graphHeightIncrements * yScale);
  const backgroundLineHorizontalIncrement =
    graphHeight / backgroundLineHorizontalDistance;

  for (let i = 0; i < backgroundLineHorizontalDistance; i++) {
    const y = i * backgroundLineHorizontalIncrement + yPadding;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", xPadding);
    line.setAttribute("y1", y);
    line.setAttribute("x2", graphWidth - xPadding);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "lightgray");
    line.setAttribute("stroke-dasharray", "2");
    svg.appendChild(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", 0);
    text.setAttribute("y", y);
    text.setAttribute("fill", "black");
    text.setAttribute("font-size", "12");
    text.setAttribute("transform", `rotate(180 0 ${y}) scale(-1, 1)`);
    text.textContent = i * graphHeightIncrements + " kB";
    svg.appendChild(text);
  }

  const monthMap = new Map([
    [0, "Jan"],
    [1, "Feb"],
    [2, "Mar"],
    [3, "Apr"],
    [4, "May"],
    [5, "Jun"],
    [6, "Jul"],
    [7, "Aug"],
    [8, "Sep"],
    [9, "Oct"],
    [10, "Nov"],
    [11, "Dec"],
  ]);

  let bigTimeInterval = false;
  let monthsDifference = calculateMonthsDifference(earliestTime, latestTime);

  // if the time period is longer than a year, make it so the background lines for time are at every 3 months instead of every month in order to save space
  if (monthsDifference >= 12) {
    bigTimeInterval = true;
    for (let i = monthsDifference; i % 3 !== 0; i++) {
      latestTime.setMonth(latestTime.getMonth() + 1);
      monthsDifference++;
    }
    monthsDifference /= 3;
  }

  const tDiff = dayDiff > 30 ? monthsDifference : dayDiff;
  const backgroundLineVerticalIncrement = (graphWidth - xPadding * 2) / tDiff;

  let startMonth = earliestTime.getMonth();
  let startYear = earliestTime.getFullYear().toString().slice(2);

  for (let i = 0; i <= tDiff; i++) {
    if (startMonth >= 12) {
      startMonth -= 12;
      startYear++;
    }
    const x = i * backgroundLineVerticalIncrement + xPadding;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", yPadding);
    line.setAttribute("x2", x);
    line.setAttribute("y2", graphHeight + yPadding);
    line.setAttribute("stroke", "lightgray");
    line.setAttribute("stroke-dasharray", "2");
    svg.appendChild(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x - 5);
    text.setAttribute("y", 5);
    text.setAttribute("fill", "black");
    text.setAttribute("font-size", "12");
    text.setAttribute("transform", `rotate(180 0 5) scale(-1, 1)`);
    if (dayDiff > 30) {
      text.textContent = `${monthMap.get(startMonth)} ${startYear}`;
      bigTimeInterval ? (startMonth += 3) : startMonth++;
    } else {
      let day = earliestTime.getDate() + i;
      let month = earliestTime.getMonth() + 1;
      let maxDay = new Date(earliestTime.getFullYear(), month, 0).getDate();
      text.textContent = `${day > maxDay ? day - maxDay : day}`;
    }
    svg.appendChild(text);
  }

  for (const data of graphData) {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", data.x);
    circle.setAttribute("cy", data.y);
    circle.setAttribute("r", "2");
    circle.setAttribute("fill", "black");
    svg.appendChild(circle);
  }

  for (let i = 1; i < graphData.length; i++) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", graphData[i - 1].x);
    line.setAttribute("y1", graphData[i - 1].y);
    line.setAttribute("x2", graphData[i].x);
    line.setAttribute("y2", graphData[i].y);
    line.setAttribute("stroke", "black");
    svg.appendChild(line);
  }

  document.getElementById("lineGraph").innerHTML = "";
  document.getElementById("lineGraph").appendChild(svg);
};

export const createXpByProjectGraph = (data) => {
  const barGraph = document.getElementById("barGraph");
  barGraph.innerHTML = "";

  const barHeight = 20;
  const barGap = 10;
  const barWidth = 300;

  const graphHeight = (barHeight + barGap) * (data.length + 1);
  barGraph.setAttribute("height", graphHeight);

  const maxValue = Math.max(...data.map((item) => item.amount));
  //const maxNotchValue = roundToHighest25(maxValue / 1000);
  //const xRatio = barWidth / (maxValue / 1000);

  //const notchCount = maxValue > 10000 ? 10 : 5;
  const xPadding = 10;
  //const notchWidth = (maxNotchValue * xRatio) / notchCount;
  //const notchValue = maxNotchValue / notchCount;

  data.forEach((item, index) => {
    const barLength = (item.amount / maxValue) * barWidth;

    const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bar.setAttribute("x", xPadding);
    bar.setAttribute("y", (index + 1) * (barHeight + barGap));
    bar.setAttribute("width", barLength);
    bar.setAttribute("height", barHeight);
    bar.setAttribute("fill", "#CD6767");

    const pathText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    pathText.setAttribute("x", barWidth);
    pathText.setAttribute(
      "y",
      (index + 1) * (barHeight + barGap) + barHeight / 2
    );
    pathText.setAttribute("dominant-baseline", "middle");
    pathText.setAttribute("fill", "black");
    pathText.setAttribute("text-anchor", "end");
    pathText.textContent = item.path;

    const amountText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    amountText.setAttribute("x", 10);
    amountText.setAttribute(
      "y",
      (index + 1) * (barHeight + barGap) + barHeight / 2
    );
    amountText.setAttribute("dominant-baseline", "middle");
    amountText.setAttribute("fill", "black");
    amountText.textContent = item.amount / 1000 + " kB";

    barGraph.appendChild(bar);
    barGraph.appendChild(pathText);
    barGraph.appendChild(amountText);
  });
};

const roundToNearest25 = (num) => {
  var returnVal = Math.round(num / 25) * 25;
  return returnVal ? returnVal : 10;
};

const roundToHighest25 = (num) => {
  const rounded = Math.ceil(num / 25) * 25;
  return num < 10 ? 10 : rounded;
};

const calculateMonthsDifference = (startDateStr, endDateStr) => {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  return (endYear - startYear) * 12 + (endMonth - startMonth);
};
