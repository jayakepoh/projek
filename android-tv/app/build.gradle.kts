plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val generatedWebAssets = layout.buildDirectory.dir("generated/webAssets")
val syncWebAssets = tasks.register<Sync>("syncWebAssets") {
    from(rootProject.projectDir.parentFile) {
        include(
            "index.html",
            "styles.css",
            "app.js",
            "channels-clean.m3u",
            "manifest.webmanifest",
            "service-worker.js",
            "icon.svg"
        )
    }
    into(generatedWebAssets.map { it.dir("www") })
}

android {
    namespace = "id.nusantara.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "id.nusantara.tv"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets.getByName("main").assets.srcDir(generatedWebAssets)
}

tasks.named("preBuild").configure {
    dependsOn(syncWebAssets)
}

dependencies {
    implementation("androidx.media3:media3-exoplayer:1.5.1")
    implementation("androidx.media3:media3-ui:1.5.1")
    implementation("androidx.webkit:webkit:1.12.1")
}