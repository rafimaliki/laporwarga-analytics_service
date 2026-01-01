const REPORT_SERVICE_URL = "http://host.docker.internal:5001/api";

export const reportsService = {
  list: async () => {
    const response = await fetch(`${REPORT_SERVICE_URL}/reports/list`);
    if (!response.ok) {
      throw new Error("Failed to fetch reports from Report Service");
    }
    return response.json();
  },
};
