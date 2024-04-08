export const createProgressGraph = (transactions, totalXp) => {
  const graphHeightIncrements = Math.round(totalXp / 100000) * 10 || 10;

  const dates = transactions.map(
    (transaction) => new Date(transaction.createdAt)
  );
  const earliestTime = new Date(Math.min(...dates));

  const latestTime = new Date(Math.max(...dates));
  const timeDiff = latestTime - earliestTime;
  const dayDiff = timeDiff / 1000 / 60 / 60 / 24;

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

  const svg = svgElement("svg", {
    width: "100%",
    height: "100%",
    viewBox: "0 0 400 300",
    preserveAspectRatio: "xMidYMid meet",
  });

  const backgroundLineHorizontalDistance =
    graphHeight / (graphHeightIncrements * yScale);
  const backgroundLineHorizontalIncrement =
    graphHeight / backgroundLineHorizontalDistance;

  for (let i = 0; i < backgroundLineHorizontalDistance; i++) {
    const y = i * backgroundLineHorizontalIncrement + yPadding;

    const line = svgElement("line", {
      x1: xPadding,
      y1: y,
      x2: graphWidth - xPadding,
      y2: y,
      stroke: "#729A9A",
      "stroke-width": "0.5px",
    });
    svg.appendChild(line);

    const text = svgElement("text", {
      x: 0,
      y: y,
      fill: "black",
      "font-size": "10",
      transform: `rotate(180 0 ${y}) scale(-1, 1)`,
    });
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
  let monthsDifference = calculateMonths(earliestTime, latestTime);

  // aggregate months if period > year
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

    const line = svgElement("line", {
      x1: x,
      y1: yPadding,
      x2: x,
      y2: graphHeight + yPadding,
      stroke: "#729A9A",
      "stroke-width": "0.5px",
    });
    svg.appendChild(line);

    const text = svgElement("text", {
      x: x - 5,
      y: 5,
      fill: "black",
      "font-size": "10",
      transform: `rotate(180 0 5) scale(-1, 1)`,
    });
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
    const circle = svgElement("circle", {
      cx: data.x,
      cy: data.y,
      r: "1.5",
      fill: "black",
    });
    svg.appendChild(circle);
  }

  for (let i = 1; i < graphData.length; i++) {
    const line = svgElement("line", {
      x1: graphData[i - 1].x,
      y1: graphData[i - 1].y,
      x2: graphData[i].x,
      y2: graphData[i].y,
      stroke: "black",
    });
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
  const xPadding = 10;

  data.forEach((item, index) => {
    const barLength = (item.amount / maxValue) * barWidth;
    const bar = svgElement("rect", {
      x: xPadding,
      y: (index + 1) * (barHeight + barGap),
      width: barLength,
      height: barHeight,
      fill: "#BDD888",
    });
    const pathText = svgElement("text", {
      x: barWidth,
      y: (index + 1) * (barHeight + barGap) + barHeight / 2,
      "dominant-baseline": "middle",
      fill: "black",
      "text-anchor": "end",
    });
    pathText.textContent = item.path;
    const amountText = svgElement("text", {
      x: 10,
      y: (index + 1) * (barHeight + barGap) + barHeight / 2,
      "dominant-baseline": "middle",
      fill: "black",
    });
    amountText.textContent = item.amount / 1000 + " kB";

    barGraph.appendChild(bar);
    barGraph.appendChild(pathText);
    barGraph.appendChild(amountText);
  });
};

const calculateMonths = (startDateStr, endDateStr) => {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  return (
    endDate.getMonth() -
    startDate.getMonth() +
    12 * (endDate.getFullYear() - startDate.getFullYear())
  );
};

const svgElement = (type, attributes) => {
  const element = document.createElementNS("http://www.w3.org/2000/svg", type);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}
