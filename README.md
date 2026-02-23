 USER AND ROLE MANAGEMENT SYSTEM

#Overview
This is a TypeScript-based Node.js backend built using Express. It serves as the foundation for a User & Role Management System.

Tech Stack

Runtime: Node.js
Language: TypeScript
Framework: Express
Middleware: CORS
Architecture: REST APIs with a clean MVC structure
Database: PostgreSQL
ORM: TypeORM (with migrations)
Testing: Jest (TDD applied to backend)
Cloud: AWS (initial deployment in week 3)

The goal of this system is to progressively build a User Management Application with Role-Based Access Control (RBAC) and pluggable authentication providers

WEEK 1: Project Setup & Foundations
    JavaScript (ES6+)
    TypeScript
    React
    Node.js
    Git
    AWS basics

    IMPLEMENTATION:
        Frontend:
            Initialized React app using TypeScript
            Configured project structure
            Created base components
            Verified local rendering
        Backend:
            Initialized Node.js project
            Configured TypeScript
            Created basic Express server
            Set up folder structure using MVC principles

WEEK 2: REST APIs, MVC & Auth Abstractions
    Objective:
        Design REST APIs using MVC architecture and introduce authentication abstraction
    Concepts Covered:
        REST API design principles
        MVC pattern
        Controller–Service separation
        Auth provider abstraction
        AWS Cloud Practitioner domain overview
        
        MVC Structure:
            Controllers handle HTTP layer
            Services contain business logic
            Models define structure
            Routes bind controllers
    Testing:
        Jest configured for backend
        Initial API tests written
        Focus on service-layer testing (TDD)
WEEK-3----Database Integration & First AWS Deployment
    Objective:
        Integrate relational database using TypeORM and deploy backend to AWS.
    Concepts Covered:
        TypeORM entities
        Repositories
        Database migrations
        Entity relationships
        Environment configuration
        AWS EC2 deployment basics

        Database Design: Core Entities

        USER:
        id
        name
        email
        password
        roles

        Role:
        id
        name
        permissions
        
        Permission:
        id
        name
        description
        
        Application:
        id
        name
        description
        
        Relationships:
        User <-> Role (many-to-many)
        Role <-> Permission (many-to-many)
        User <-> Application (many-to-many)

        AWS Deployment (Week 3):
        Backend deployed to AWS using:
        EC2 instance
        Node.js runtime
        Environment variables configured
        PostgreSQl connected

