# Bookkeeping Application (Billing Service)

## Application Overview

This bookkeeping application is designed to streamline business financial operations. It provides tools for managing companies, users, inventory, sales, purchases, and reports. The application supports multi-branch setups and role-based access control to ensure secure and efficient operations. With features like dashboards for daily summaries, detailed reports, and filters for quick data retrieval, it is built to meet the needs of businesses of various scales.

## Architecture 
![System Design](https://github.com/user-attachments/assets/95731e3b-9951-4de6-bfa2-8c4e36ed53aa)

## ERD
![final_erd](https://github.com/user-attachments/assets/b78e5594-3ec2-4205-be31-3d691364b9a2)



## Supported Features

* User Registration & Login
* Add Company, Branches to the company
* Company Management
   - Update Company Config & Details
   - Add Role (ACL)
   - Edit Role
   - Add User
   - Update User
* Dashboard
   - Quick Actions (Add Sale, Add Purchase, View Inventory)
   - Cash In, Cash Out for the day
   - Total Payments Due, Total Collections Due until today
   - Top Selling Items for this month
   - Low stock items
* Inventory
   - View all Items
   - Add Item
   - Search Item
   - Update Item
   - Filter by active/inactive items, low stock items.
   - Adjust Item Stock
* Parties
   - View all parties
   - Add Party
   - Search Party
   - Update Party 
   - Filter party by active/inactive
* Purchases
   - View all purchases
   - Search by invoice number
   - Add purchase
   - Update purchase
   - View Purchase
      - Get Purchase Returns
      - Add Purchase Return
   - Filters
      - By Party
      - Transaction Type: All/Cash/Credit
      - Transaction Date Time
      - By Overdue Payments
* Sales
   - View All Sales
   - Search by invoice number
   - Add Sale
   - Update Sale
   - View Sale
      - Get Sale Returns
      - Add Sale Return
      - Print Sale
      - Share Sale
   - Filter Sales
      - By Party
      - By Transaction Type: All/Cash/Credit
      - By Transaction Date Time
      - By Overdue Payments
* Quotations
   - View All Quotations
   - Search by Quotation Number
   - Add Quotation
   - Update Quotation
   - View Quotation
      - Print Quotation
      - Share Quotation
   - Convert to Invoice
   - Filter Quotation
      - By Party
      - By Quotation Date Time
* Item Transfers
   - View All Transfers To & From Company Branch
   - Add Transfer
   - Filter Transfers
      - By Type: All/Received/Sent
      - By Date Time
* Reports
   - Add Report
      - Day end summary report
      - Day end detailed report
      - Sale report
      - Purchase report
      - Sale return report
      - Purchase return report
   - View Report
   - Delete Report


## Service Overview 

The service is responsible for providing the following features: 

* Third Party Management
* Purchase & Purchase Returns Management
* Quotations Management
* Sales & Sale Returns Management
* Dashboard Insights
