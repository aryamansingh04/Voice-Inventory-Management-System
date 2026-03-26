DROP DATABASE IF EXISTS InventoryDB;
CREATE DATABASE InventoryDB;
USE InventoryDB;

CREATE TABLE Category (
    Cat_ID INT PRIMARY KEY,
    Cat_Name VARCHAR(50),
    Cat_Desc VARCHAR(100)
);
CREATE TABLE Product (
    P_ID INT PRIMARY KEY,
    P_Name VARCHAR(50),
    P_Desc VARCHAR(100),
    MFG DATE,
    quantity INT,
    is_low_stock BOOLEAN DEFAULT FALSE,
    Cat_ID INT,
    FOREIGN KEY (Cat_ID) REFERENCES Category(Cat_ID)
);
CREATE TABLE Supplier (
    Sup_ID INT PRIMARY KEY,
    Sup_Name VARCHAR(50),
    Address VARCHAR(100),
    Pincode INT
);
CREATE TABLE Customer (
    C_ID INT PRIMARY KEY,
    F_Name VARCHAR(50),
    L_Name VARCHAR(50),
    C_Address VARCHAR(100),
    Pincode INT
);
CREATE TABLE Orders (
    O_ID INT PRIMARY KEY,
    O_Date DATE,
    O_Desc VARCHAR(100),
    O_Amount INT,
    C_ID INT,
    FOREIGN KEY (C_ID) REFERENCES Customer(C_ID)
);
CREATE TABLE Order_Product (
    O_ID INT,
    P_ID INT,
    Ordered_Quantity INT,
    PRIMARY KEY (O_ID, P_ID),
    FOREIGN KEY (O_ID) REFERENCES Orders(O_ID),
    FOREIGN KEY (P_ID) REFERENCES Product(P_ID)
);
DELIMITER $$

CREATE TRIGGER check_low_stock
BEFORE UPDATE ON Product
FOR EACH ROW
BEGIN
    IF NEW.quantity < 10 THEN
        SET NEW.is_low_stock = TRUE;
    ELSE
        SET NEW.is_low_stock = FALSE;
    END IF;
END$$

DELIMITER ;

