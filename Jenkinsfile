pipeline {
    agent { docker { image 'node:10-alpine' } }
    stages {
        stage('build') {
            steps {
                sh 'npm --version'
            }
        }
    }
}