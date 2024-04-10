export const createProgressGraph = (transactions, totalXp) => {
  const graphHeightIncrements = Math.round(totalXp / 100000) * 10 || 10;

  const dates = transactions.map(
    (transaction) => new Date(transaction.createdAt)
  );
  const earliestTime = new Date(Math.min(...dates));
  const latestTime = new Date(Math.max(...dates));
  const timeDiff = latestTime - earliestTime;
  const dayDiff = Math.ceil(timeDiff / 1000 / 60 / 60 / 24);

  const timeRange = document.getElementById("timeRange");

  timeRange.textContent = `(${earliestTime
    .toString()
    .slice(4, 15)} - ${latestTime.toString().slice(4, 15)})`;
  if (dayDiff > 30 && latestTime.getDate() !== 1) {
    latestTime.setMonth(latestTime.getMonth() + 1);
    latestTime.setDate(1);
  } else {
    latestTime.setDate(latestTime.getDate() + 1);
    latestTime.setHours(0, 0, 0, 0);
  }

  // add the baseline to the beginning of the transactions array
  if (dayDiff > 30 && earliestTime.getDate() !== 1) {
    earliestTime.setDate(1);
  } else {
    earliestTime.setHours(0, 0, 0, 0);
  }
  transactions.unshift({
    amount: 0,
    createdAt: Math.min(...dates),
  });

  const graphWidth = 440;
  const graphHeight = 300;
  const xPadding = 40;
  const yPadding = 20;

  totalXp /= 1000;
  const xScale = (graphWidth - 2 * xPadding) / (latestTime - earliestTime);
  const yScale = (graphHeight - 2 * yPadding) / totalXp;

  const graphData = transactions.map((transaction) => {
    totalXp -= transaction.amount / 1000;
    return {
      x: (new Date(transaction.createdAt) - earliestTime) * xScale + xPadding,
      y: graphHeight - (totalXp * yScale + yPadding),
      title: transaction.path,
    };
  });

  const hsvg = svgElement("svg", {
    width: "100%",
    height: "100%",
    viewBox: "0 0 100 30",
    preserveAspectRatio: "xMidYMid meet",
    class: "hidden",
  });
  document.getElementById("lineGraph").appendChild(hsvg);

  const svg = svgElement("svg", {
    width: "100%",
    height: "100%",
    viewBox: "0 0 415 315",
    preserveAspectRatio: "xMidYMid meet",
  });

  const horizontalLineDistance = graphHeight / (graphHeightIncrements * yScale);
  const horizontalLineIncrement = graphHeight / horizontalLineDistance;

  let y = 0;
  for (let i = 0; i < horizontalLineDistance; i++) {
    y = i * horizontalLineIncrement + yPadding;

    const line = svgElement("line", {
      x1: xPadding,
      y1: y,
      x2: graphWidth - xPadding,
      y2: y,
      stroke: "#cde1ec",
      "stroke-width": "0.5px",
    });
    svg.appendChild(line);

    const text = svgElement("text", {
      x: 0,
      y: y + 3,
      fill: "black",
      "font-size": "10",
      transform: `rotate(180 0 ${y}) scale(-1, 1)`,
    });
    text.textContent = i * graphHeightIncrements + " kB";
    hsvg.appendChild(text);
    const dx = Math.round(xPadding - text.getComputedTextLength());
    text.setAttribute("x", dx - 5);
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
  const verticalLineIncrement = (graphWidth - 2 * xPadding) / tDiff;

  let startMonth = earliestTime.getMonth();
  let startYear = earliestTime.getFullYear().toString().slice(2);

  for (let i = 0; i <= tDiff; i++) {
    if (startMonth >= 12) {
      startMonth -= 12;
      startYear++;
    }
    const x = i * verticalLineIncrement + xPadding;

    const line = svgElement("line", {
      x1: x,
      y1: yPadding,
      x2: x,
      y2: y,
      stroke: "#cde1ec",
      "stroke-width": "0.5px",
    });
    svg.appendChild(line);

    if (i < tDiff) {
      const text = svgElement("text", {
        x: x,
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
      hsvg.appendChild(text);
      const dx = Math.round(
        (verticalLineIncrement - text.getComputedTextLength()) / 2
      );
      text.setAttribute("x", x + dx);
      svg.appendChild(text);
    }
  }
  for (let i = 1; i < graphData.length; i++) {
    const line = svgElement("line", {
      x1: graphData[i - 1].x,
      y1: graphData[i - 1].y,
      x2: graphData[i].x,
      y2: graphData[i].y,
      stroke: "#2066a8",
    });
    svg.appendChild(line);
  }

  //console.log("graphData:",graphData);
  for (const data of graphData) {
    const circle = svgElement("circle", {
      cx: data.x,
      cy: data.y,
      r: "1.5",
      fill: "#2066a8",
    });
    if (data.title) circle.innerHTML = `<title>${data.title.replace("/johvi/", "")}</title>`;
    svg.appendChild(circle);
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
      fill: "#d47264", 
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
    amountText.textContent = (item.amount / 1000).toFixed(1) + " kB";

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
};
