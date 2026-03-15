package org.example.controller;
import org.example.model.LineageRecord;
import org.example.service.LineageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
@RestController
@RequestMapping("/api/lineage")
@CrossOrigin(origins = "http://localhost:3000")

public class LineageController {

    @Autowired
    private LineageService lineageService;

    @GetMapping
    public List<LineageRecord> getAllLineageRecords() {
        return lineageService.getAllLineageRecords();
    }

    @PostMapping("/import")
    public ResponseEntity<?> importCsv(@RequestParam("file") MultipartFile file) {
        try {
            lineageService.importCsvFile(file);
            return ResponseEntity.ok().body("File imported successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error importing file: " + e.getMessage());
        }
    }

    @GetMapping("/graph")
    public ResponseEntity<?> getLineageGraph() {
        return ResponseEntity.ok(lineageService.getLineageGraph());
    }


}
