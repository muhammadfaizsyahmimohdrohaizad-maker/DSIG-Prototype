-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3307
-- Generation Time: Jul 22, 2026 at 04:08 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `havlook_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `initials` varchar(5) NOT NULL,
  `desc` text NOT NULL,
  `desc_text` varchar(255) NOT NULL,
  `score` int(11) NOT NULL,
  `history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`history`)),
  `factors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`factors`)),
  `risk_label` varchar(50) NOT NULL,
  `is_danger` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `name`, `email`, `initials`, `desc`, `desc_text`, `score`, `history`, `factors`, `risk_label`, `is_danger`) VALUES
(1, 'Acme Corp', 'AcmeCorp@gmail.com', 'AC', 'License seats drop (-24%) and CS ticket spikes (+12)', '', 28, '[68,62,55,48,36,28]', '[{\"name\":\"Support Tickets\",\"val\":\"+12 tickets\",\"percent\":85,\"isPositive\":false},{\"name\":\"Seat Utilization\",\"val\":\"-24%\",\"percent\":65,\"isPositive\":false}]', '', 0),
(2, 'BetaSoft', 'BetaSoft@gmail.com', 'BS', 'Admin inactive for 18 days & renewal in 30 days', '', 42, '[58,55,52,49,44,42]', '[{\"name\":\"Admin Inactivity\",\"val\":\"18 days\",\"percent\":70,\"isPositive\":false},{\"name\":\"Contract Renewal\",\"val\":\"30 days\",\"percent\":50,\"isPositive\":false}]', '', 0),
(3, 'CloudScale AI', 'CloudScaleAI@gmail.com', 'CS', 'NPS survey response score 9/10, expansion candidate', '', 88, '[72,75,78,82,85,88]', '[{\"name\":\"NPS Rating\",\"val\":\"9 / 10\",\"percent\":90,\"isPositive\":true},{\"name\":\"API Usage Growth\",\"val\":\"+45%\",\"percent\":85,\"isPositive\":true}]', '', 0),
(5, 'DataPulse Inc.', 'contact@datapulse.io', 'DP', 'API usage dropped by 45% over past 30 days', 'Critical reduction in API call volume across core services.', 22, '[60,52,45,35,28,22]', '[{\"name\":\"API Usage\",\"val\":\"-45%\",\"impact\":\"high\"},{\"name\":\"Tickets\",\"val\":\"+8 tickets\",\"impact\":\"medium\"}]', 'High Risk', 1),
(6, 'Nexus Systems', 'support@nexus.com', 'NS', 'Payment failed twice; billing contact unresponsive', 'Automated credit card charge failure on monthly renewal.', 15, '[70,65,50,32,20,15]', '[{\"name\":\"Billing Failure\",\"val\":\"2 Failed Charges\",\"impact\":\"critical\"}]', 'Critical Risk', 1),
(7, 'OmniGrowth', 'admin@omnigrowth.co', 'OG', 'NPS score 10/10; account expansion request logged', 'High executive engagement and team adoption.', 94, '[80,82,85,88,91,94]', '[{\"name\":\"NPS Rating\",\"val\":\"10 / 10\",\"percent\":100}]', 'Healthy', 0),
(8, 'CyberShield', 'info@cybershield.tech', 'CS', '3 executive users logged out for 21 consecutive days', 'Key decision makers inactive prior to contract renewal.', 35, '[65,58,50,45,38,35]', '[{\"name\":\"Exec Inactivity\",\"val\":\"21 days\",\"impact\":\"high\"}]', 'High Risk', 1),
(9, 'Vanguard Labs', 'ops@vanguardlabs.io', 'VL', 'Steady seat additions (+15 seats in Q2)', 'Consistent usage growth across engineering teams.', 85, '[70,72,76,80,82,85]', '[{\"name\":\"Seat Growth\",\"val\":\"+15 seats\",\"percent\":85}]', 'Healthy', 0),
(10, 'Hyperion Media', 'billing@hyperion.com', 'HM', 'Support tickets regarding sync delays spiked (+18)', 'Technical issues impacting platform adoption.', 40, '[68,60,55,48,42,40]', '[{\"name\":\"Support Tickets\",\"val\":\"+18 tickets\",\"impact\":\"medium\"}]', 'Medium Risk', 0),
(11, 'Starlight Global', 'hello@starlight.org', 'SG', 'Primary champion left company; new admin onboarded', 'Change in key stakeholder requires team outreach.', 48, '[75,70,62,55,50,48]', '[{\"name\":\"Stakeholder Change\",\"val\":\"New Admin\",\"impact\":\"medium\"}]', 'Medium Risk', 0),
(12, 'Aether Dynamics', 'contact@aetherdynamics.com', 'AD', 'Feature utilization under 15% of plan capacity', 'Low feature adoption across mid-tier management.', 31, '[55,50,44,38,33,31]', '[{\"name\":\"Feature Adoption\",\"val\":\"15%\",\"impact\":\"high\"}]', 'High Risk', 1),
(13, 'Quantum Logistics', 'team@quantumlog.com', 'QL', 'Account healthy with high daily active user count', 'Sustained daily usage across operations department.', 92, '[85,86,88,89,90,92]', '[{\"name\":\"Daily Usage\",\"val\":\"98% DAU\",\"percent\":95}]', 'Healthy', 0),
(14, 'Zenith FinTech', 'admin@zenithfin.io', 'ZF', 'Unresolved critical bug ticket open for 14 days', 'Escalated support issue pending patch release.', 29, '[62,55,48,39,32,29]', '[{\"name\":\"Open Bug Ticket\",\"val\":\"14 days open\",\"impact\":\"critical\"}]', 'High Risk', 1),
(15, 'Solaris Energy', 'info@solaris.net', 'SE', 'Contract renewal coming up in 14 days; no response', 'Renewal notice sent; pending confirmation.', 38, '[60,55,50,45,40,38]', '[{\"name\":\"Upcoming Renewal\",\"val\":\"14 days\",\"impact\":\"high\"}]', 'High Risk', 1),
(16, 'Echo Analytics', 'devs@echoanalytics.io', 'EA', 'New integration activated; seat count doubled', 'Product adoption expanding into new department.', 96, '[78,82,86,90,93,96]', '[{\"name\":\"Seat Expansion\",\"val\":\"+100%\",\"percent\":98}]', 'Healthy', 0);

-- --------------------------------------------------------

--
-- Table structure for table `shap_factors`
--

CREATE TABLE `shap_factors` (
  `id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `val` varchar(10) NOT NULL,
  `percent` int(11) NOT NULL,
  `is_positive` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `shap_factors`
--
ALTER TABLE `shap_factors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `account_id` (`account_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `shap_factors`
--
ALTER TABLE `shap_factors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `shap_factors`
--
ALTER TABLE `shap_factors`
  ADD CONSTRAINT `shap_factors_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
