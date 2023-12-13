use crate::models::package_manager::{PackageManager, PackageMeta};
use clap::arg;

pub fn install_command() -> clap::Command {
    clap::Command::new("package")
        .arg(
            arg!(-i --install <PACKAGE> ... "install a package")
                .num_args(1..)
                .id("install")
                .action(clap::ArgAction::Append),
        )
        .arg(
            arg!(-U <PACKAGE> ... "install a package")
                .num_args(1..)
                .id("install")
                .action(clap::ArgAction::Append),
        )
        .subcommand(clap::Command::new("install").args(&[arg!([NAME] ...).id("install")]))
        .subcommand(clap::Command::new("add").args(&[arg!([NAME] ...).id("install")]))
}

pub fn uninstall_command() -> clap::Command {
    clap::Command::new("package")
        .arg(
            arg!(-u --uninstall <PACKAGE> ... "install a package")
                .num_args(1..)
                .id("uninstall")
                .action(clap::ArgAction::Append),
        )
        .subcommand(clap::Command::new("uninstall").args(&[arg!([NAME] ...).id("uninstall")]))
        .subcommand(clap::Command::new("remove").args(&[arg!([NAME] ...).id("uninstall")]))
}

fn install(arr: &Vec<String>) -> Option<(String, Vec<String>)> {
    println!("we are you {:?}", arr);
    Some((String::from(""), vec![]))
}

fn uninstall(arr: &Vec<String>) -> Option<(String, Vec<String>)> {
    println!("{:?}", arr);
    Some((String::from(""), vec![]))
}

fn build_package_version(package: &str, version: &str) -> String {
    match version {
        "latest" => package.to_string(),
        _ => package.to_string() + version,
    }
}

fn parse_command(commands: &Vec<String>) -> Vec<String> {
    commands.to_vec()
}

fn get_package_and_version(package: &str) -> PackageMeta {
    match package.split("@").collect::<Vec<_>>()[..] {
        [program, version] => PackageMeta {
            name: program.to_string(),
            version: version.to_string(),
        },
        [program] => PackageMeta {
            name: program.to_string(),
            version: "latest".to_string(),
        },
        _ => {
            panic!("should really not happen");
        }
    }
}

pub fn default() -> PackageManager {
    PackageManager {
        install,
        uninstall,
        parse_command,
        get_package_and_version,
        build_package_version,
        uninstall_command,
        install_command,
        name: String::from("default"),
        packages: vec![],
    }
}
