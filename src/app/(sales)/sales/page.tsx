import React from "react";

const SalesPage = () => {
  return (
    <main
      style={{
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        color: "#111",
      }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Sales</h1>
        <p style={{ color: "#555", marginTop: "0.5rem" }}>
          Overview of sales performance and key metrics.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <article
          style={{
            padding: "1.25rem",
            borderRadius: "12px",
            background: "#f8f9fb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{ margin: "0 0 0.75rem", fontSize: "1rem", color: "#444" }}
          >
            Total Revenue
          </h2>
          <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>
            $128,450
          </p>
        </article>

        <article
          style={{
            padding: "1.25rem",
            borderRadius: "12px",
            background: "#f8f9fb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{ margin: "0 0 0.75rem", fontSize: "1rem", color: "#444" }}
          >
            New Orders
          </h2>
          <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>342</p>
        </article>

        <article
          style={{
            padding: "1.25rem",
            borderRadius: "12px",
            background: "#f8f9fb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{ margin: "0 0 0.75rem", fontSize: "1rem", color: "#444" }}
          >
            Conversion Rate
          </h2>
          <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>
            7.8%
          </p>
        </article>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "14px",
            background: "#fff",
            border: "1px solid #e4e7ec",
          }}
        >
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem" }}>
            Recent Sales
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.95rem",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #e4e7ec",
                    color: "#666",
                  }}
                >
                  Customer
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #e4e7ec",
                    color: "#666",
                  }}
                >
                  Amount
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #e4e7ec",
                    color: "#666",
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  style={{
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #f1f3f5",
                  }}
                >
                  Acme Corp
                </td>
                <td
                  style={{
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #f1f3f5",
                  }}
                >
                  $12,300
                </td>
                <td
                  style={{
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #f1f3f5",
                  }}
                >
                  Completed
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #f1f3f5",
                  }}
                >
                  Zenith Labs
                </td>
                <td
                  style={{
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #f1f3f5",
                  }}
                >
                  $8,760
                </td>
                <td
                  style={{
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #f1f3f5",
                  }}
                >
                  Pending
                </td>
              </tr>
              <tr>
                <td style={{ padding: "0.75rem 0" }}>Nova Retail</td>
                <td style={{ padding: "0.75rem 0" }}>$4,500</td>
                <td style={{ padding: "0.75rem 0" }}>Shipped</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default SalesPage;
