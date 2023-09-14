/* eslint-disable require-jsdoc */
/* eslint-disable no-tabs */
/* eslint-disable max-len */

const mysql = require('mysql2');
const inquirer = require('inquirer');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

const db = mysql.createConnection({
	host: process.env.HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
});

console.log(`Server running on port ${PORT}`);
promptUserMain();

async function promptUserMain() {
	try {
		const mainlist = await inquirer.prompt([
			{
				name: 'choice',
				message: 'What would you like to do?',
				type: 'list',
				choices: [
					'View all employees',
					'View departments',
					'View all roles',
					'Add department',
					'Add Role',
					'Add employee',
					'Update employee'
				]
			}
		]);

		switch (mainlist.choice) {
			case 'View all employees':
				db.query(
					`SELECT * FROM employees;`,

					(err, results) => {
						if (err) throw err;

						console.table(results);
						promptUserMain();
					}
				);
		}

		switch (mainlist.choice) {
			case 'View departments':
				db.query(
					`SELECT * FROM departments`,

					(err, results) => {
						if (err) throw err;

						console.table(results);
						promptUserMain();
					}
				);
		}
		switch (mainlist.choice) {
			case 'View all roles':
				db.query(
					`SELECT 
departments.dept_name AS department_name,
CONCAT(employees.firstname, ' ', employees.lastname) AS employee_name,
roles.title AS title,
roles.salary AS salary,
CONCAT(managers.firstname, ' ', managers.lastname) AS manager_name
FROM 
employees
JOIN 
roles ON employees.role_id = roles.id
JOIN 
departments ON roles.department_id = departments.id
LEFT JOIN 
employees AS managers ON employees.manager_id = managers.id;`,

					(err, results) => {
						if (err) throw err;

						console.table(results);
						promptUserMain();
					}
				);
				break;
			// Break to switch to new function
		}
		await newDeptFunc();
		async function newDeptFunc() {
			switch (mainlist.choice) {
				case 'Add department':
					let { newDept } = await inquirer.prompt([
						{
							name: 'newDept',
							message: 'Please enter the new department name.',
							type: 'input'
						}
					]);

					db.query(`INSERT INTO departments (dept_name) VALUES (?)`, //insert updated to match other functions
						[newDept],
						(err, results) => {
							if (err) throw err;
							console.log('New department has been added.');
							promptUserMain();
						}
					);
			}
		}
		await newRoleFunc();
		async function newRoleFunc() {
			db.query(`SELECT * FROM departments`, (err, departmentResults) => {
				if (err) throw err;
				const departmentChoices = departmentResults.map((dept) => ({
					name: dept.dept_name,
					value: dept.id
				}));

				switch (mainlist.choice) {
					case 'Add Role':
						inquirer
							.prompt([
								{
									name: 'newRole',
									message: 'Please enter the name of the new title/role.',
									type: 'input'
								},
								{
									name: 'newSalary',
									message: 'What is the salary for this new position.',
									type: 'input'
								},
								{
									name: 'deptSelect',
									message: 'Please select the departments this role belongs to.',
									type: 'list',
									choices: departmentChoices
								}
							])
							.then((answers) => {
								const { newRole, newSalary, deptSelect } = answers;
								db.query(
									'INSERT INTO roles (title, salary, department_id) VALUES (?, ?, ?)',

									[newRole, newSalary, deptSelect],

									(err, _results) => {
										if (err) throw err;
										console.error(err);

										console.log('New role and salary added to the department.');
										promptUserMain();
									}
								);
							});
				}
			});

			await newEmployee();
			async function newEmployee() {
				db.query(`SELECT * from employees`, (err, employeeResults) => {
					if (err) throw err;
					const employeeChoices = employeeResults.map((emp) => ({
						name: `${emp.firstname} ${emp.lastname}`,
						value: emp.manager_id
					}));
					db.query(`SELECT * from roles`, (err, rolesResults) => {
						if (err) throw err;
						const roleChoice = rolesResults.map((roles) => ({
							name: `${roles.title}`,
							value: roles.id
						}));
						switch (mainlist.choice) {
							case 'Add employee':
								inquirer
									.prompt([
										{
											name: 'firstname',
											message: 'Please enter the employees first name.',
											type: 'input'
										},
										{
											name: 'lastname',
											mesaage: 'Please enter the employees last name.',
											type: 'input'
										},
										{
											name: 'role_id',
											message: 'Select the employees role/title',
											type: 'list',
											choices: roleChoice
										},
										{
											name: 'manager_id',
											message: 'Who will the new employee report to?',
											type: 'list',
											choices: employeeChoices
										},
									])
									.then((answers) => {
										const { firstname, lastname, role_id, manager_id } = answers;
										db.query(
											`INSERT INTO employees (firstname, lastName, role_id, manager_id) VALUES (?, ?, ?, ?)`,

											[firstname, lastname, role_id, manager_id],
											(err, _results) => {
												console.error(err);
												console.log('New employee added');
												promptUserMain();
											});
									});
						}
					});
				});
				await employeeEditor();
				async function employeeEditor() {
					db.query(`SELECT * FROM employees`, (err, employeeUpdater) => {
						if (err) throw err;
						const chooseEmployee = employeeUpdater.map((employee) => ({
							name: `${employee.firstname} ${employee.lastname}`,
							value: employee.id
						}));
						// console.log(employeeUpdater)
						db.query(`SELECT * FROM roles`, (err, roleSelector) => {
							if (err) throw err;
							const chooseExistingRole = roleSelector.map((roles) => ({
								name: roles.title,
								value: roles.id
							}));
							// console.log(employeeUpdater)
							switch (mainlist.choice) {
								case 'Update employee':
									inquirer
										.prompt([
											{
												name: 'employeeUpdate',

												message: 'Please select the employee you would like to edit.',
												type: 'list',
												choices: chooseEmployee
											},
											{
												name: 'newRole',
												message: 'Please select the new role for this employee.',
												type: 'list',
												choices: chooseExistingRole
											}
										])
										.then((answers) => {
											const { employeeUpdate, newRole } = answers;
											db.query(
												`UPDATE employees SET role_id = ? WHERE id = ?`,
												[newRole, employeeUpdate],
												(err, _results) => {
													console.error(err);
													if (_results.affectedRows === 0) {
														console.log("No matching employee found.");
													} else {
														console.log('Employee role/title updated.');
													}
													promptUserMain();
												});
										});
							}
						});
					});
				}
			}
		}
	} catch (error) {
		console.error('Error in prompt:', error);
	}
}
